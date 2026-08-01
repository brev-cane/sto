import React, { useEffect, useState } from "react";
import { Linking, Platform, AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { BellOff } from "lucide-react-native";
import { useAuth } from "@/contexts/authContext";
import { dbService } from "@/services/dbService";
import { registerForPushNotificationsAsync } from "@/utils/notificationHelper";
import PermissionBanner from "@/components/ui/permissionBanner";

/**
 * Registers for push on mount and, while notifications are switched off at
 * the OS level, keeps a banner on screen explaining that live takeover alerts
 * can't arrive until they're turned back on.
 *
 * The banner stays put rather than being dismissable — missing the alert
 * means missing the takeover, so it's worth the standing reminder — but it is
 * strictly informational. It occupies one row, covers nothing, and blocks no
 * feature: per App Store Guideline 4.5.4 the app has to stay usable without
 * push, so the takeover itself remains reachable from the home screen either
 * way (see `handleSend` there).
 *
 * There is also deliberately no pre-prompt and no ✕ on the request itself:
 * per Guideline 5.1.1(iv) the OS prompt is the only thing standing between
 * the user and the decision. This renders solely for the already-denied case,
 * which is the Settings link Apple recommends.
 */
export default function ImprovedPushPermissionComponent() {
  const [blocked, setBlocked] = useState(false);
  const { userDoc, setUserDoc } = useAuth();



  async function checkPermission() {
    const settings = await Notifications.getPermissionsAsync();

    const isGranted =
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;

    const isBlocked =
      settings.ios?.status === Notifications.IosAuthorizationStatus.DENIED ||
      (!settings.canAskAgain && !isGranted);
    registerForPushNotificationsAsync().then(async (pushToken) => {
      // Only write when the token is real and actually changed — this runs
      // on every app foreground, so an unconditional update would cost a
      // Firestore write per open
      if (
        pushToken &&
        pushToken.startsWith("ExponentPushToken[") &&
        userDoc?.id &&
        pushToken !== userDoc.pushToken
      ) {
        await dbService
          .collection("users")
          .update(userDoc?.id, { pushToken: pushToken });
        setUserDoc({ ...userDoc, pushToken: pushToken });
      }
    });
    setBlocked(isBlocked);
  }
  useEffect(() => {
    checkPermission();

    // 👇 Listen to app foreground events
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkPermission();
      }
    });

    return () => subscription.remove();
  }, []);
  function openSettings() {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  }

  // Only the already-denied case has anything to say. While the permission
  // is undetermined the OS prompt is doing the talking, so render nothing.
  if (!blocked) return null;

  return (
    <PermissionBanner
      Icon={BellOff}
      title="Notifications are off"
      text="Turn them on to be alerted the moment a takeover starts."
      accessibilityLabel="Notifications are off. Open Settings to turn on takeover alerts."
      onPress={openSettings}
    />
  );
}
