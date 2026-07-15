import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteField, serverTimestamp } from "firebase/firestore";
import { dbService } from "@/services/dbService";

/**
 * All expo-location usage lives here (foreground-only — we never track in
 * the background). The stored users/{uid}.location powers geo-targeted
 * alerts; the server treats locations older than 24h as unknown.
 */

/** Don't write a new location to Firestore more often than this */
export const LOCATION_SYNC_MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

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
}

export async function getLocationPermission(): Promise<Location.LocationPermissionResponse> {
  return Location.getForegroundPermissionsAsync();
}

/** Shows the OS prompt. Returns true when permission was granted. */
export async function requestLocationPermission(): Promise<boolean> {
  const response = await Location.requestForegroundPermissionsAsync();
  return response.granted;
}

/** Returns null on failure (permission missing, GPS off, timeout) */
export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    console.log("Failed to get current position:", error);
    return null;
  }
}

/**
 * Reads the device position and stores it on users/{userId}.location.
 * Silently does nothing when permission isn't granted, and throttles
 * writes to one per LOCATION_SYNC_MIN_INTERVAL_MS unless `force` is set.
 * Returns true when a location was written.
 */
export async function syncLocationToFirestore(
  userId: string,
  options?: { force?: boolean }
): Promise<boolean> {
  try {
    if (await isLocationSharingOptedOut()) return false;

    const permission = await getLocationPermission();
    if (!permission.granted) return false;

    if (!options?.force) {
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (
        lastSync &&
        Date.now() - Number(lastSync) < LOCATION_SYNC_MIN_INTERVAL_MS
      ) {
        return false;
      }
    }

    const coords = await getCurrentCoords();
    if (!coords) return false;

    await dbService.collection("users").update(userId, {
      location: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        updatedAt: serverTimestamp(),
      },
    });
    await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    return true;
  } catch (error) {
    console.log("Failed to sync location:", error);
    return false;
  }
}

/** Removes the stored location so the user is no longer geo-targeted */
export async function clearStoredLocation(userId: string): Promise<void> {
  await dbService.collection("users").update(userId, {
    location: deleteField(),
  });
  await AsyncStorage.removeItem(LAST_SYNC_KEY);
}
