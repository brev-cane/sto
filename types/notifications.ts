/**
 * Shared types for geo-targeted push notifications.
 * The server-side counterpart lives in stoFunctions/functions/index.js
 * (validateGeoFilter / classifyUserForGeoFilter) — keep shapes in sync.
 */

export type GeoMode = "within" | "outside";

export interface GeoCenter {
  latitude: number;
  longitude: number;
  /** Human-readable place name shown in the UI and audit logs */
  label?: string;
}

export interface GeoFilter {
  enabled: boolean;
  mode: GeoMode;
  /** 100–5000, enforced server-side */
  radiusMeters: number;
  center: { latitude: number; longitude: number };
  label?: string;
}

export const GEO_RADIUS_MIN_M = 100;
export const GEO_RADIUS_MAX_M = 5000;
export const GEO_RADIUS_STEP_M = 100;
export const GEO_RADIUS_DEFAULT_M = 500;

/**
 * 100m-ring distance histogram returned by getUsersWithPushTokensCount for
 * a geo filter — lets the client preview any radius/mode without another
 * function invocation. Last bucket = users beyond GEO_RADIUS_MAX_M.
 */
export interface ReachHistogram {
  bucketSizeMeters: number;
  buckets: number[];
  /**
   * Users who opted into all alerts, counted here because they bypass the
   * location filter entirely — only applies to "outside"-mode sends. On
   * "within" (radius) sends this is always 0: opt-in no longer bypasses
   * location, so those users need a fresh location inside the radius like
   * everyone else.
   */
  optIn: number;
  noLocation?: number;
  stale?: number;
}

/** Last known device location stored on users/{uid} */
export interface UserLocation {
  latitude: number;
  longitude: number;
  /** Firestore Timestamp (serverTimestamp on write) */
  updatedAt?: unknown;
}

export function formatRadius(meters: number): string {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}
