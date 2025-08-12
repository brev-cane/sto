import { Vibration } from "react-native";

// [delay, vibrate, pause, vibrate, pause...]
export const UNIQUE_VIBRATION_PATTERN = [0, 400, 200, 400, 200, 800];

export function triggerUniqueVibration() {
  Vibration.vibrate(UNIQUE_VIBRATION_PATTERN);
}
