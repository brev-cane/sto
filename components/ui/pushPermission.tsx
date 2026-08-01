import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  AppState,
} from "react-native";
import * as Notifications from "expo-notifications";
import { BellOff, ChevronRight } from "lucide-react-native";
import { useAuth } from "@/contexts/authContext";
import { dbService } from "@/services/dbService";
import { registerForPushNotificationsAsync } from "@/utils/notificationHelper";
import { Theme, useTheme, useThemedStyles } from "@/theme";

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
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
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
    <TouchableOpacity
      style={styles.banner}
      onPress={openSettings}
      accessibilityRole="button"
      accessibilityLabel="Notifications are off. Open Settings to turn on takeover alerts."
    >
      <View style={styles.iconTile}>
        <BellOff size={16} color={colors.primary} />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>Notifications are off</Text>
        <Text style={styles.text}>
          Turn them on to be alerted the moment a takeover starts.
        </Text>
      </View>

      <ChevronRight size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    // No flex here: the banner is sized by its content so it can sit above the
    // home screen's scroll view without ever eating into it
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      borderRadius: 12,
      marginBottom: 12, 
    },
    iconTile: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    copy: {
      flex: 1,
    },
    title: {
      ...typography.body,
      fontWeight: "600",
      color: colors.text,
    },
    text: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginTop: 1,
    },
  });
