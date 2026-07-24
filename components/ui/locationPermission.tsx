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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/authContext";
import { dbService } from "@/services/dbService";
import {
  getLocationPermission,
  requestLocationPermission,
  syncLocationToFirestore,
} from "@/services/locationService";
import { Theme, useThemedStyles } from "@/theme";

const HIDE_KEY = "hideLocationPermissionCard";

/**
 * Home-screen card explaining why we ask for location (geo-targeted alerts)
 * before showing the OS prompt. Users who would rather not share location
 * can opt into receiving ALL alerts instead (users.receiveAllNotifications).
 * Mirrors the pushPermission.tsx mount + AppState-active check pattern,
 * but unlike push it never force-reshows after dismissal — location is
 * optional by design.
 */
export default function LocationPermissionCard() {
  const { userDoc, setUserDoc } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const [granted, setGranted] = useState<boolean | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [hidden, setHidden] = useState(true); // start hidden to avoid a flash
  const [saving, setSaving] = useState(false);
  const userId = userDoc?.id;

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const [hideValue, permission] = await Promise.all([
          AsyncStorage.getItem(HIDE_KEY),
          getLocationPermission(),
        ]);
        if (!active) return;
        setHidden(hideValue === "true");
        setGranted(permission.granted);
        setCanAskAgain(permission.canAskAgain);
        if (permission.granted && userId) {
          // Keep the stored location fresh (throttled internally)
          syncLocationToFirestore(userId);
        }
      } catch (error) {
        console.log("Failed to check location permission:", error);
      }
    }

    refresh();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refresh();
      }
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [userId]);

  async function handleShareLocation() {
    setSaving(true);
    try {
      const ok = await requestLocationPermission();
      if (ok && userId) {
        await syncLocationToFirestore(userId, { force: true });
      }
      const permission = await getLocationPermission();
      setGranted(permission.granted);
      setCanAskAgain(permission.canAskAgain);
    } finally {
      setSaving(false);
    }
  }

  async function handleReceiveAll() {
    if (!userDoc?.id) return;
    setSaving(true);
    try {
      await dbService
        .collection("users")
        .update(userDoc.id, { receiveAllNotifications: true });
      setUserDoc({ ...userDoc, receiveAllNotifications: true });
    } catch (error) {
      console.log("Failed to save notification preference:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDismiss() {
    await AsyncStorage.setItem(HIDE_KEY, "true");
    setHidden(true);
  }

  function openSettings() {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  }

  if (
    !userDoc ||
    hidden ||
    granted !== false ||
    userDoc.receiveAllNotifications === true
  ) {
    return null;
  }

  const blocked = !canAskAgain;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.title}>📍 Location Sharing</Text>
      <Text style={styles.text}>
        The app uses your phone&apos;s location to reduce the number of
        unnecessary alerts. For example, if you&apos;re at Highmark Stadium,
        there&apos;s no need to receive the &quot;Shout song&quot; or &quot;Mr
        Brightside&quot; alert, but if you&apos;re enjoying the game from
        elsewhere, you may enjoy those! You&apos;ll also receive fewer
        &quot;event-type&quot; and testing alerts. We highly encourage this
        setting.
      </Text>

      {blocked ? (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={openSettings}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>
            ⚙️ Enable Location in Settings
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleShareLocation}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>Share My Location</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={handleReceiveAll} disabled={saving}>
        <Text style={styles.secondaryText}>
          No thanks — send me ALL alerts instead
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 12,
      marginHorizontal: 8,
      marginBottom: 8,
      padding: 20,
      alignItems: "center",
    },
    dismissButton: {
      position: "absolute",
      top: 8,
      right: 12,
      padding: 4,
    },
    dismissText: {
      ...typography.button,
      color: colors.textMuted,
    },
    title: {
      ...typography.h3,
      color: colors.text,
      marginBottom: 10,
      textAlign: "center",
    },
    text: {
      ...typography.body,
      textAlign: "center",
      color: colors.textSecondary,
      marginBottom: 16,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginBottom: 12,
    },
    primaryButtonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
    secondaryText: {
      ...typography.bodySmall,
      color: colors.primary,
      textDecorationLine: "underline",
      textAlign: "center",
    },
  });
