import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  Linking,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MapPinOff } from "lucide-react-native";
import { useAuth } from "@/contexts/authContext";
import { dbService } from "@/services/dbService";
import {
  getLocationPermission,
  requestLocationPermission,
  syncLocationToFirestore,
} from "@/services/locationService";
import PermissionBanner from "@/components/ui/permissionBanner";
import { Theme, useThemedStyles } from "@/theme";

const HIDE_KEY = "hideLocationPermissionCard";

/**
 * Home-screen card explaining why we ask for location (geo-targeted alerts)
 * before showing the OS prompt, plus the Settings banner that replaces it
 * once the OS has been asked and the answer was no.
 *
 * App Store Guideline 5.1.1(iv): the card must not be dismissable and must
 * not offer any way around the request — its single action always leads to
 * the OS prompt. The two states are therefore strictly sequential and never
 * overlap: the card shows only while the OS can still ask, the banner only
 * once it can't. Offering both at once would put a way around the prompt
 * right next to it, which is the thing the guideline forbids.
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

  /**
   * The card's only action. Always shows the OS prompt, then retires the
   * card whichever way the user answered. Denying falls back to "send me
   * everything" so those users still get alerts rather than silence — the
   * same outcome the old opt-out link produced, now reached through the
   * system prompt instead of around it.
   */
  async function handleContinue() {
    setSaving(true);
    try {
      const ok = await requestLocationPermission();
      if (ok && userId) {
        await syncLocationToFirestore(userId, { force: true });
      } else if (!ok && userDoc) {
        try {
          await dbService
            .collection("users")
            .update(userDoc.id, { receiveAllNotifications: true });
          setUserDoc({ ...userDoc, receiveAllNotifications: true });
        } catch (error) {
          console.log("Failed to save notification preference:", error);
        }
      }
      const permission = await getLocationPermission();
      setGranted(permission.granted);
      setCanAskAgain(permission.canAskAgain);
      await AsyncStorage.setItem(HIDE_KEY, "true");
      setHidden(true);
    } finally {
      setSaving(false);
    }
  }

  function openSettings() {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  }

  if (!userDoc || granted !== false) {
    return null;
  }

  // Asked and declined. `hidden` is only ever written after the OS prompt has
  // come back, so either flag means the prompt has had its turn — the second
  // covers Android, where a first denial leaves `canAskAgain` true but asking
  // again would just be nagging. Pointing at Settings is what Apple suggested
  // for features that can't work without location: here, the geo-filtering
  // that keeps alerts relevant to where you actually are.
  if (!canAskAgain || hidden) {
    return (
      <PermissionBanner
        Icon={MapPinOff}
        title="Location is off"
        text="Turn it on to only get alerts for the games you're actually at."
        accessibilityLabel="Location is off. Open Settings to turn on location so alerts are filtered to where you are."
        onPress={openSettings}
      />
    );
  }

  // Pre-prompt: the OS can still ask, so the card gets its one shot at
  // explaining why before `handleContinue` hands over to the system prompt.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📍 Location Sharing</Text>
      <Text style={styles.text}>
        The app uses your phone&apos;s location to reduce the number of
        unnecessary alerts. For example, if you&apos;re at Highmark Stadium,
        there&apos;s no need to receive the &quot;Shout song&quot; or &quot;Mr
        Brightside&quot; alert, but if you&apos;re enjoying the game from
        elsewhere, you may enjoy those! You&apos;ll also receive fewer
        &quot;event-type&quot; and testing alerts.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleContinue}
        disabled={saving}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
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
      // Sits inline among the home screen's cards, which supply their own
      // horizontal padding — no inset of its own
      marginBottom: 12,
      padding: 20,
      alignItems: "center",
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
    },
    primaryButtonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
  });
