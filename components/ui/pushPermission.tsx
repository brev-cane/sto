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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/authContext";
import { dbService } from "@/services/dbService";
import { registerForPushNotificationsAsync } from "@/utils/notificationHelper";
import { Theme, useThemedStyles } from "@/theme";

export default function ImprovedPushPermissionComponent() {
  const styles = useThemedStyles(makeStyles);
  const [allowed, setAllowed] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { userDoc, setUserDoc } = useAuth();

  useEffect(() => {
    loadHidden();
    checkPermission();

    // 👇 Listen to app foreground events
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkPermission();
      }
    });

    return () => subscription.remove();
  }, []);

  async function loadHidden() {
    const value = await AsyncStorage.getItem("hidePushPermissionCard");
    if (value === "true") setHidden(true);
  }

  async function saveHidden() {
    await AsyncStorage.setItem("hidePushPermissionCard", "true");
    setHidden(true);
  }

  async function unhide() {
    await AsyncStorage.removeItem("hidePushPermissionCard");
    setHidden(false);
  }

  async function checkPermission() {
    const settings = await Notifications.getPermissionsAsync();

    const isGranted =
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;

    const isBlocked =
      settings.ios?.status === Notifications.IosAuthorizationStatus.DENIED ||
      (!settings.canAskAgain && !settings.granted);
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
    setAllowed(isGranted);
    setBlocked(isBlocked);

    // 👉 if notifications are off, force show card
    if (!isGranted) unhide();
  }

  function openSettings() {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  }

  // ❌ Hide only when allowed AND user hid it
  if (allowed) return null;

  return (
    <View style={styles.container}>
      {blocked && (
        <View style={styles.notAllowedBox}>
          <Text style={styles.title}>🔕 Notifications Disabled</Text>
          <Text style={styles.text}>
            You've turned off notifications — the crowd misses you 😢
          </Text>

          <View style={styles.stepsBox}>
            <Text style={styles.step}>
              1️⃣ Open <Text style={styles.bold}>Settings</Text>
            </Text>
            <Text style={styles.step}>
              2️⃣ Tap <Text style={styles.bold}>Notifications</Text>
            </Text>
            <Text style={styles.step}>
              3️⃣ Enable <Text style={styles.bold}>Allow Notifications</Text>
            </Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={openSettings}>
            <Text style={styles.buttonText}>⚙️ Open Settings Now</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>We’ll save you a seat 💌</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 30,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 12,
      marginHorizontal: 8,
      minHeight: 300,
    },
    allowedBox: {
      alignItems: "center",
      padding: 30,
    },
    notAllowedBox: {
      alignItems: "center",
      padding: 30,
    },
    title: {
      ...typography.h3,
      color: colors.text,
      marginBottom: 12,
      textAlign: "center",
    },
    text: {
      ...typography.body,
      textAlign: "center",
      color: colors.textSecondary,
      marginBottom: 20,
    },
    stepsBox: {
      marginBottom: 20,
      width: "100%",
    },
    step: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: 6,
      textAlign: "left",
    },
    bold: {
      fontWeight: "700",
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginBottom: 14,
    },
    smallButton: {
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 8,
    },
    smallButtonText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    buttonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
    footerText: {
      ...typography.bodySmall,
      color: colors.textMuted,
      textAlign: "center",
    },
  });
