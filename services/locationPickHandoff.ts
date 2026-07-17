import { GeoCenter } from "@/types/notifications";

/**
 * One-shot handoff between the LocationSearch modal screen and whoever
 * opened it. A callback can't ride along in navigation params (React
 * Navigation warns on non-serializable values), and the Admin form isn't a
 * route of its own, so results can't come back via route params either.
 */
type LocationPickHandler = (center: GeoCenter) => void;

let handler: LocationPickHandler | null = null;

/** Register right before navigating to the LocationSearch screen. */
export function setLocationPickHandler(next: LocationPickHandler | null) {
  handler = next;
}

/** Called by LocationSearch when the user picks a place. Fires once. */
export function deliverPickedLocation(center: GeoCenter) {
  handler?.(center);
  handler = null;
}
