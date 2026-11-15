import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LocateFixed, MapPin } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { useAuth } from "@/contexts/authContext";
import {
  getLocationPermission,
  isLocationSharingOptedOut,
  isLocationStale,
  isPreciseLocationGranted,
  locationUpdatedAtMs,
  syncLocationToFirestore,
} from "@/services/locationService";
import { formatRelativeTime } from "@/utils/formatHelper";
import { Theme, useTheme, useThemedStyles } from "@/theme";

/**
 * Shows the location we currently have stored for this user — the one the
 * backend geo-targets alerts against — and gives them a way to refresh it.
 *
 * Two things make this worth surfacing rather than syncing silently. The
 * server discards any location older than 24h (LOCATION_MAX_AGE_MS), so a
 * user can quietly fall out of every geo-targeted send with no way to tell;
 * and a location captured at home last week is actively wrong once they're
 * at the stadium. The card makes both visible and one tap fixable.
 *
 * It renders only when location sharing is actually on. While the OS can
 * still be asked, LocationPermissionCard owns the screen — showing a second
 * location affordance next to that pre-prompt is exactly what App Store
 * Guideline 5.1.1(iv) forbids.
 */
export default function SavedLocationCard() {
  const { userDoc, setUserDoc } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [sharingOn, setSharingOn] = useState<boolean | null>(null);
  const [precise, setPrecise] = useState(true);
  const [updating, setUpdating] = useState(false);
  // A missing/stale location heals itself once per mount. Without the guard,
  // a device that can't get a fix would retry on every AppState change.
  const autoRefreshedRef = useRef(false);

  const location = userDoc?.location ?? null;
  const stale = isLocationStale(location);

  // Read inside the effect rather than depended on, so a successful refresh
  // flipping stale to false doesn't tear down and rebuild the AppState
  // subscription below.
  const staleRef = useRef(stale);

  // refreshLocation needs the current document to merge into, but closing
  // over it would give the callback a new identity on every write and
  // restart the effect below with it. The ref keeps both stable.
  const userDocRef = useRef(userDoc);
  useEffect(() => {
    userDocRef.current = userDoc;
    staleRef.current = stale;
  });

  const refreshLocation = useCallback(
    async (options?: { silent?: boolean }) => {
      const current = userDocRef.current;
      if (!current) return;
      setUpdating(true);
      try {
        const next = await syncLocationToFirestore(current.id, { force: true });
        // Re-read: the user can sign out while the fix is in flight, and
        // writing a document back into a signed-out context would resurrect it.
        const latest = userDocRef.current;
        if (next && latest) {
          // Seed the context so the card re-renders off the write we just
          // made instead of waiting on a read-back of the document.
          setUserDoc({ ...latest, location: next });
          if (!options?.silent) {
            Toast.show({ type: "success", text1: "Location updated" });
          }
        } else if (!next && !options?.silent) {
          Toast.show({
            type: "error",
            text1: "Couldn't update location",
            text2: "Check that location services are on and try again.",
          });
        }
      } finally {
        setUpdating(false);
      }
    },
    [setUserDoc],
  );

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const [permission, optedOut] = await Promise.all([
          getLocationPermission(),
          isLocationSharingOptedOut(),
        ]);
        if (!active) return;

        const on = permission.granted && !optedOut;
        setSharingOn(on);
        setPrecise(isPreciseLocationGranted(permission));

        // Opening the app is the moment a stale location matters most — it's
        // usually game day. Heal it in the background so the common case
        // shows a current location rather than a warning to act on.
        if (on && staleRef.current && !autoRefreshedRef.current) {
          autoRefreshedRef.current = true;
          void refreshLocation({ silent: true });
        }
      } catch (error) {
        console.log("Failed to check location sharing state:", error);
      }
    }

    check();

    // Sharing can be switched off in Settings or on the Profile screen while
    // this card is mounted; re-check whenever we come back to the foreground.
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") check();
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [refreshLocation]);

  if (!userDoc || !sharingOn) return null;

  const updatedAtMs = locationUpdatedAtMs(location?.updatedAt);
  const placeName =
    location?.label ??
    (location
      ? // 5 decimal places is roughly a meter; fewer would round away the
        // precision we just went to the trouble of capturing.
        `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
      : "No location saved yet");

  // Say how sharp the fix is, so a coarse one reads as coarse rather than as
  // a confidently wrong address.
  const accuracyNote =
    typeof location?.accuracyMeters === "number"
      ? `±${location.accuracyMeters} m`
      : null;

  const subtitle = !location
    ? "Update so alerts match where you are"
    : stale
      ? updatedAtMs
        ? `Out of date — saved ${formatRelativeTime(updatedAtMs)}`
        : "Out of date — update to keep alerts relevant"
      : [
          updatedAtMs ? `Updated ${formatRelativeTime(updatedAtMs)}` : "Saved",
          accuracyNote,
        ]
          .filter(Boolean)
          .join(" · ");

  const accent = stale ? colors.warning : colors.primary;

  return (
    <View style={[styles.container, stale && { borderColor: accent }]}>
      <View style={styles.row}>
        <View style={[styles.iconTile, { backgroundColor: accent }]}>
          <MapPin size={18} color={colors.onPrimary} />
        </View>

        <View style={styles.textColumn}>
          <Text style={styles.title} numberOfLines={2}>
            {placeName}
          </Text>
          <Text
            style={[styles.subtitle, stale && { color: accent }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.updateButton, updating && styles.updateButtonDisabled]}
          onPress={() => refreshLocation()}
          disabled={updating}
          accessibilityRole="button"
          accessibilityLabel="Update to my current location"
        >
          {updating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <LocateFixed size={15} color={colors.primary} />
              <Text style={styles.updateButtonText}>Update</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Approximate location is fuzzed by the OS before we ever see it, so
          no amount of refreshing will sharpen it — Settings is the only fix,
          and saying so beats showing an address that looks plain wrong. */}
      {!precise && (
        <TouchableOpacity
          style={styles.preciseHint}
          onPress={openLocationSettings}
          accessibilityRole="button"
          accessibilityLabel="Open Settings to turn on Precise Location"
        >
          <Text style={styles.preciseHintText}>
            Precise Location is off, so this can only be approximate. Turn it on
            in Settings for your exact position.
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function openLocationSettings() {
  if (Platform.OS === "ios") {
    Linking.openURL("app-settings:");
  } else {
    Linking.openSettings();
  }
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      // Sits inline among the home screen's cards, which supply their own
      // horizontal padding — no inset of its own
      marginBottom: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    preciseHint: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
    },
    preciseHintText: {
      ...typography.caption,
      color: colors.warning,
    },
    iconTile: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    textColumn: {
      flex: 1,
    },
    title: {
      ...typography.body,
      fontWeight: "600",
      color: colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    updateButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      minWidth: 86,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.primaryMuted,
    },
    updateButtonDisabled: {
      opacity: 0.6,
    },
    updateButtonText: {
      ...typography.caption,
      fontWeight: "600",
      color: colors.primary,
    },
  });
