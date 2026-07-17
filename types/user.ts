import { UserLocation } from "./notifications";

export interface AppUser {
  id: string;
  name: string;
  /** Unique public handle shown to other users */
  username?: string;
  /** Download URL of the profile picture in Firebase Storage */
  photoURL?: string;
  email: string;
  pushToken: string;
  role?: "admin" | null;
  /** Last known device location, used for geo-targeted alerts */
  location?: UserLocation | null;
  /** Opt-in to receive every alert regardless of geo-targeting */
  receiveAllNotifications?: boolean;
}