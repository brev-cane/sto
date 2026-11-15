import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteField, serverTimestamp } from "firebase/firestore";
import { dbService } from "@/services/dbService";
import { UserLocation } from "@/types/notifications";

/**
 * All expo-location usage lives here (foreground-only — we never track in
 * the background). The stored users/{uid}.location powers geo-targeted
 * alerts; the server treats locations older than 24h as unknown.
 */

/** Don't write a new location to Firestore more often than this */
export const LOCATION_SYNC_MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Past this age the server stops geo-targeting a user at all — it treats the
 * stored location as unknown. Mirrors LOCATION_MAX_AGE_HOURS in
 * stoFunctions/functions/index.js; keep the two in sync so the app never
 * shows a location as current that the backend has already discarded.
 */
export const LOCATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const LAST_SYNC_KEY = "lastLocationSyncAt";
const OPT_OUT_KEY = "locationSharingOptOut";

/**
 * User-level opt-out (Profile screen). The OS permission can stay granted
 * while the user disables sharing in-app; every sync respects this flag.
 */
export async function isLocationSharingOptedOut(): Promise<boolean> {
  return (await AsyncStorage.getItem(OPT_OUT_KEY)) === "true";
}

export async function setLocationSharingOptOut(optOut: boolean): Promise<void> {
  if (optOut) {
    await AsyncStorage.setItem(OPT_OUT_KEY, "true");
  } else {
    await AsyncStorage.removeItem(OPT_OUT_KEY);
  }
}

export interface Coords {
  latitude: number;
  longitude: number;
  /** Radius of uncertainty in meters, straight from the OS. Null if unknown. */
  accuracy?: number | null;
}

/**
 * How long we'll wait for a precise GPS fix before settling for the last
 * known position. A Highest-accuracy fix can take a while indoors — which is
 * exactly where people are before kickoff — but the UI can't hang on it.
 */
const CURRENT_POSITION_TIMEOUT_MS = 15000;
/** A cached fix older than this isn't worth showing as "your location" */
const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;

export async function getLocationPermission(): Promise<Location.LocationPermissionResponse> {
  return Location.getForegroundPermissionsAsync();
}

/**
 * iOS 14+ lets the user grant location *approximately*: the OS itself
 * rounds the position to a several-kilometer region before the app ever
 * sees it, so no accuracy setting on our side can sharpen it. Only the
 * Precise Location switch in Settings can — this tells the UI when to say
 * so instead of showing a wrong-looking address. Always true on Android and
 * on iOS below 14, where the concept doesn't exist.
 */
export function isPreciseLocationGranted(
  permission: Location.LocationPermissionResponse,
): boolean {
  return permission.ios?.accuracy !== "reduced";
}

/** Shows the OS prompt. Returns true when permission was granted. */
export async function requestLocationPermission(): Promise<boolean> {
  const response = await Location.requestForegroundPermissionsAsync();
  return response.granted;
}

/**
 * Returns null on failure (permission missing, GPS off, no fix in time).
 *
 * Asks for Highest accuracy — a stadium-radius geo-filter can be as tight as
 * 100m, which is the entire error budget of the Balanced setting, and the
 * address we show the user is only as precise as the point we geocode. When
 * the fix doesn't arrive in time we fall back to a recent cached one rather
 * than returning nothing.
 */
export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const position = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      }),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), CURRENT_POSITION_TIMEOUT_MS);
      }),
    ]).finally(() => clearTimeout(timer));

    const fix =
      position ??
      (await Location.getLastKnownPositionAsync({
        maxAge: LAST_KNOWN_MAX_AGE_MS,
      }));
    if (!fix) return null;

    return {
      latitude: fix.coords.latitude,
      longitude: fix.coords.longitude,
      accuracy: fix.coords.accuracy,
    };
  } catch (error) {
    console.log("Failed to get current position:", error);
    return null;
  }
}

/** Google's Geocoding API — the same key the Places search already uses. */
const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const GEOCODE_TIMEOUT_MS = 8000;

/**
 * Result types worth preferring, most specific first. Google returns its
 * results roughly most-specific first too, but the top entry is often a plus
 * code — a coordinate in disguise, which is exactly what we're trying to
 * translate away from.
 */
const RESULT_TYPE_PRIORITY = [
  "street_address",
  "subpremise",
  "premise",
  "route",
  "establishment",
  "point_of_interest",
];

/** "G9C5+5F5" — Open Location Code, never worth showing to a user. */
const PLUS_CODE = /^[23456789CFGHJMPQRVWX]{4,}\+[23456789CFGHJMPQRVWX]{2,}$/i;

interface GoogleAddressComponent {
  long_name: string;
  types: string[];
}

interface GoogleGeocodeResult {
  types?: string[];
  address_components?: GoogleAddressComponent[];
  formatted_address?: string;
}

/** First component carrying any of `types`, ignoring plus codes. */
function pickComponent(
  components: GoogleAddressComponent[],
  types: string[],
): string | null {
  for (const type of types) {
    const match = components.find(
      (component) =>
        component.types?.includes(type) &&
        component.long_name?.trim() &&
        !PLUS_CODE.test(component.long_name.trim()),
    );
    if (match) return match.long_name.trim();
  }
  return null;
}

/**
 * Best-effort street-level name for a point — "Gurumangat Road, Gulberg 2,
 * Lahore" rather than just "Punjab".
 *
 * Google first, the OS geocoder second. Apple's CLGeocoder and Android's
 * Geocoder both thin out badly outside North America and Europe: outside
 * their coverage they return a placemark with nothing but `region` filled
 * in, which is where a bare province name comes from. Google's locality
 * coverage is far better, and the app already ships a key for it.
 *
 * Purely cosmetic either way — every failure resolves to undefined rather
 * than propagating. Never let this decide whether a location gets stored.
 */
export async function reverseGeocodeLabel(
  coords: Coords,
): Promise<string | undefined> {
  const fromGoogle = await googleReverseGeocodeLabel(coords);
  if (fromGoogle) return fromGoogle;
  return nativeReverseGeocodeLabel(coords);
}

async function googleReverseGeocodeLabel(
  coords: Coords,
): Promise<string | undefined> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!key) return undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${GOOGLE_GEOCODE_URL}?latlng=${coords.latitude},${coords.longitude}&key=${key}`,
      { signal: controller.signal },
    );
    const data = await response.json();

    const results: GoogleGeocodeResult[] = data.results ?? [];
    if (data.status !== "OK" || !results.length) {
      // REQUEST_DENIED here almost always means the Geocoding API isn't
      // enabled for this key — it's a separate product from Places, and the
      // key works fine for search while failing this call.
      console.log(
        "Google reverse geocode unavailable:",
        data.status,
        data.error_message ?? "",
      );
      return undefined;
    }

    const result =
      RESULT_TYPE_PRIORITY.map((type) =>
        results.find((candidate) => candidate.types?.includes(type)),
      ).find(Boolean) ?? results[0];

    const components = result?.address_components ?? [];
    if (!components.length) return undefined;

    // Built from typed components rather than formatted_address, which
    // carries the country and can lead with a plus code.
    const street = [
      pickComponent(components, ["street_number", "premise"]),
      pickComponent(components, ["route"]),
    ]
      .filter(Boolean)
      .join(" ");

    const parts = [
      // Only meaningful when we actually landed on a named place
      pickComponent(components, ["establishment", "point_of_interest"]),
      street || null,
      pickComponent(components, [
        "sublocality_level_1",
        "neighborhood",
        "sublocality",
      ]),
      pickComponent(components, ["locality", "administrative_area_level_2"]),
    ].filter((part): part is string => !!part);

    const unique = parts.filter((part, i) => parts.indexOf(part) === i);
    return unique.length ? unique.slice(0, 3).join(", ") : undefined;
  } catch (error) {
    console.log("Google reverse geocode failed:", error);
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function nativeReverseGeocodeLabel(
  coords: Coords,
): Promise<string | undefined> {
  try {
    const [place] = await Location.reverseGeocodeAsync(coords);
    if (!place) return undefined;

    // Android composes a full address for us; iOS always leaves this null.
    if (place.formattedAddress?.trim()) {
      return trimAddress(place.formattedAddress);
    }

    // A placemark name is the most specific thing available ("Highmark
    // Stadium") — except when it's just the street number, which only
    // duplicates the street line below.
    const isStreetNumber = !!place.name && /^\d+\w?$/.test(place.name.trim());
    const streetLine = [place.streetNumber, place.street]
      .filter(Boolean)
      .join(" ");

    const parts = [
      place.name && !isStreetNumber ? place.name : null,
      streetLine || null,
      place.district,
      place.city ?? place.subregion,
      place.region,
    ].filter((part): part is string => !!part && part.trim().length > 0);

    // De-duplicate: "Buffalo, Buffalo, NY" happens when name === city
    const unique = parts.filter((part, i) => parts.indexOf(part) === i);
    return unique.length ? trimAddress(unique.join(", ")) : undefined;
  } catch (error) {
    console.log("Reverse geocode failed:", error);
    return undefined;
  }
}

/**
 * Keeps a label to the parts that identify a place. Country and postal code
 * come back on some platforms and only push the useful half out of a
 * single-line display.
 */
function trimAddress(address: string): string {
  const segments = address
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments.slice(0, 3).join(", ");
}

/**
 * Milliseconds for a stored `updatedAt`, which arrives as a Firestore
 * Timestamp from a server read but as a plain number for the location we
 * just wrote ourselves — serverTimestamp() resolves only on the server, so
 * the client seeds its own clock value for display until the next read.
 */
export function locationUpdatedAtMs(updatedAt: unknown): number | null {
  if (typeof updatedAt === "number" && Number.isFinite(updatedAt)) {
    return updatedAt;
  }
  if (updatedAt instanceof Date) return updatedAt.getTime();
  const timestamp = updatedAt as { toMillis?: () => number } | null;
  if (typeof timestamp?.toMillis === "function") {
    try {
      return timestamp.toMillis();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * True once the backend would stop geo-targeting this location. A location
 * with no readable timestamp counts as stale: we can't prove it's fresh, and
 * the server won't either.
 */
export function isLocationStale(location?: UserLocation | null): boolean {
  if (!location) return true;
  const updatedAtMs = locationUpdatedAtMs(location.updatedAt);
  if (updatedAtMs === null) return true;
  return Date.now() - updatedAtMs > LOCATION_MAX_AGE_MS;
}

/**
 * Reads the device position and stores it on users/{userId}.location.
 * Silently does nothing when permission isn't granted, and throttles
 * writes to one per LOCATION_SYNC_MIN_INTERVAL_MS unless `force` is set.
 *
 * Returns the location that was written — with `updatedAt` as a client
 * clock value standing in for the unresolved serverTimestamp — so callers
 * can show it immediately instead of reading the document back. Null means
 * nothing was written, for any reason.
 */
export async function syncLocationToFirestore(
  userId: string,
  options?: { force?: boolean },
): Promise<UserLocation | null> {
  try {
    if (await isLocationSharingOptedOut()) return null;

    const permission = await getLocationPermission();
    if (!permission.granted) return null;

    if (!options?.force) {
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (
        lastSync &&
        Date.now() - Number(lastSync) < LOCATION_SYNC_MIN_INTERVAL_MS
      ) {
        return null;
      }
    }

    const coords = await getCurrentCoords();
    if (!coords) return null;

    const label = await reverseGeocodeLabel(coords);

    // Firestore rejects undefined values, so the label is only spread in
    // when we actually resolved one.
    const accuracyMeters =
      typeof coords.accuracy === "number" ? Math.round(coords.accuracy) : null;

    // Two very different failures both surface as a vague-looking place name:
    // a coarse fix (large radius — nothing can sharpen it but Settings) and a
    // thin geocoder result (small radius, vague label). Logging both together
    // is what tells them apart.
    console.log(
      `Location fix: ±${accuracyMeters ?? "?"}m -> ${label ?? "(no label)"}`,
    );

    await dbService.collection("users").update(userId, {
      location: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        updatedAt: serverTimestamp(),
        source: "device",
        accuracyMeters,
        ...(label ? { label } : {}),
      },
    });
    await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));

    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      updatedAt: Date.now(),
      source: "device",
      accuracyMeters,
      label,
    };
  } catch (error) {
    console.log("Failed to sync location:", error);
    return null;
  }
}

/** Removes the stored location so the user is no longer geo-targeted */
export async function clearStoredLocation(userId: string): Promise<void> {
  await dbService.collection("users").update(userId, {
    location: deleteField(),
  });
  await AsyncStorage.removeItem(LAST_SYNC_KEY);
}
