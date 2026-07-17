import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Switch,
  TextInput,
  ScrollView,
} from "react-native";
import * as Sentry from "@sentry/react-native";
import Slider from "@react-native-community/slider";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useAuth } from "@/contexts/authContext";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import { User, Video } from "lucide-react-native";
import SearchableDropdown from "@/components/ui/searchableDropDown";
import GeoTargetingSection from "@/components/ui/geoTargetingSection";
import { httpsCallable } from "firebase/functions";
import { collection, getDocs, query, where } from "firebase/firestore";
import { functions, FIREBASE_AUTH, FIRESTORE_DB } from "@/FirebaseConfig";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import VideoUploadSheet from "@/components/ui/videoUploadSheet";
import {
  GEO_RADIUS_DEFAULT_M,
  GeoCenter,
  GeoMode,
  ReachHistogram,
} from "@/types/notifications";

type VideoOption = {
  file: string;
  name: string;
  thumbnailURL?: string;
  /** Playable on old app builds that still bundle this video */
  legacy: boolean;
  createdAtMs: number;
};

export default function AdminScreen() {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [videoOptions, setVideoOptions] = useState<VideoOption[]>([]);
  const uploadSheetRef = useRef<TrueSheet>(null);
  const [delay, setDelay] = useState(30);
  const [loading, setLoading] = useState(false);
  const [tokensCount, setTokensCount] = useState(0);
  const { userDoc } = useAuth(); // Add 'user' from auth context
  const [isEnabled, setIsEnabled] = useState(__DEV__ ? true : false);
  const [customUsers, setCustomUsers] = useState(false);
  const [customUsersToken, setCustomUsersToken] = useState<string[]>([]);
  const [token, setToken] = useState(""); // This is now a user ID, not a token
  const user = FIREBASE_AUTH.currentUser; // Get current authenticated user
  const [title, setTitle] = useState("Stadium Takeover");
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [geoMode, setGeoMode] = useState<GeoMode>("within");
  const [radiusMeters, setRadiusMeters] = useState(GEO_RADIUS_DEFAULT_M);
  const [geoCenter, setGeoCenter] = useState<GeoCenter | null>(null);
  const [reachHistogram, setReachHistogram] = useState<ReachHistogram | null>(
    null
  );
  const [reachLoading, setReachLoading] = useState(false);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const toggleSwitch = () => setIsEnabled((previousState) => !previousState);
  const toggleSwitch2 = () => setCustomUsers((previousState) => !previousState);

  const countUsers = async () => {
    try {
      // Check if user is authenticated first
      const currentUser = FIREBASE_AUTH.currentUser;
      if (!currentUser) {
        console.log("User not authenticated yet");
        return;
      }

      console.log("Fetching user count as:", currentUser.uid);

      const getUserCount = httpsCallable(
        functions,
        "getUsersWithPushTokensCount"
      );
      const result = await getUserCount();
      const data = result.data as any;

      if (data.success) {
        setTokensCount(data.count);
        console.log("User count fetched:", data.count);
      }
    } catch (error: any) {
      console.error("Error counting users:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      if (error.code === "functions/unauthenticated") {
        Alert.alert("Authentication Error", "Please log in again");
      } else if (error.code === "functions/permission-denied") {
        Alert.alert("Permission Denied", "Admin access required");
      }
    }
  };

  const loadVideoOptions = useCallback(async () => {
    try {
      const snapshot = await getDocs(
        query(
          collection(FIRESTORE_DB, "videos"),
          where("status", "==", "ready"),
          where("active", "==", true)
        )
      );
      const options = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            file: docSnap.id,
            name: data.name ?? docSnap.id,
            thumbnailURL: data.thumbnailURL,
            legacy: !!data.legacyFileName,
            createdAtMs: data.createdAt?.toMillis?.() ?? 0,
          };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      setVideoOptions(options);
    } catch (error) {
      console.log("Failed to load video catalog:", error);
    }
  }, []);

  useEffect(() => {
    // Only fetch count when user is authenticated and loaded. Keyed on ids
    // (not object identity) so userDoc refreshes don't refetch the count
    if (user && userDoc) {
      console.log("User authenticated:", user.uid);
      console.log("User role:", userDoc.role);
      countUsers();
      loadVideoOptions();
    } else {
      console.log("Waiting for auth...", { user: !!user, userDoc: !!userDoc });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, userDoc?.id]);

  // Reach preview: one invocation per chosen location — the returned
  // distance histogram lets radius/mode changes recompute the estimate
  // locally without calling the function again
  useEffect(() => {
    const active = !!(geoEnabled && geoCenter);
    const timer = setTimeout(
      async () => {
        if (!active || !geoCenter) {
          setReachHistogram(null);
          setReachLoading(false);
          return;
        }
        setReachLoading(true);
        try {
          const getUserCount = httpsCallable(
            functions,
            "getUsersWithPushTokensCount"
          );
          const result = await getUserCount({
            geoFilter: {
              enabled: true,
              // mode/radius don't affect the histogram; fixed values keep
              // this effect keyed on the center only
              mode: "within",
              radiusMeters: GEO_RADIUS_DEFAULT_M,
              center: {
                latitude: geoCenter.latitude,
                longitude: geoCenter.longitude,
              },
            },
          });
          const data = result.data as any;
          setReachHistogram(
            data.success && data.histogram ? data.histogram : null
          );
        } catch (error) {
          console.log("Failed to estimate reach:", error);
          setReachHistogram(null);
        } finally {
          setReachLoading(false);
        }
      },
      active ? 500 : 0
    );

    return () => clearTimeout(timer);
  }, [geoEnabled, geoCenter]);

  const estimatedReach = useMemo(() => {
    if (!reachHistogram?.buckets?.length) return null;
    const { bucketSizeMeters, buckets, optIn } = reachHistogram;
    const withinBucketCount = Math.min(
      Math.floor(radiusMeters / bucketSizeMeters),
      buckets.length
    );
    const within = buckets
      .slice(0, withinBucketCount)
      .reduce((sum, n) => sum + n, 0);
    const located = buckets.reduce((sum, n) => sum + n, 0);
    return (geoMode === "within" ? within : located - within) + optIn;
  }, [reachHistogram, geoMode, radiusMeters]);

  const handleSend = async () => {
    if (selectedVideos.length === 0) {
      Alert.alert("Error", "Please select at least one video");
      return;
    }

    if (geoEnabled && !geoCenter) {
      Alert.alert(
        "Error",
        "Choose a trigger location for geo-targeting, or turn geo-targeting off"
      );
      return;
    }

    // Videos without a bundled counterpart can't play on app versions that
    // predate cloud-delivered videos — make the admin acknowledge that.
    const newOnly = selectedVideos.filter((id) => {
      const option = videoOptions.find((opt) => opt.file === id);
      return option ? !option.legacy : false;
    });
    if (newOnly.length > 0) {
      Alert.alert(
        "Heads up",
        "Some selected videos only play on the latest app version. Users on older versions will see an error instead.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Send Anyway", onPress: () => doSend() },
        ]
      );
      return;
    }

    doSend();
  };

  const doSend = async () => {
    try {
      setLoading(true);

      const sendNotification = httpsCallable(
        functions,
        "sendStadiumTakeoverNotification"
      );
      const params = {
        title: title,
        videoIds: selectedVideos.join(","),
        delaySeconds: delay,
        adminOnly: isEnabled,
        customTokens: customUsers ? customUsersToken : null,
        geoFilter:
          geoEnabled && geoCenter
            ? {
                enabled: true,
                mode: geoMode,
                radiusMeters,
                center: {
                  latitude: geoCenter.latitude,
                  longitude: geoCenter.longitude,
                },
                label: geoCenter.label ?? null,
              }
            : null,
      };

      console.log("Params :", params);
      const result = await sendNotification(params);
      Sentry.captureMessage(JSON.stringify(result.data));
    } catch (err: any) {
      Sentry.captureException(err);
      console.error("Error sending notification:", err);

      // Handle specific Firebase errors
      if (err.code === "functions/unauthenticated") {
        Alert.alert("Error", "You must be logged in to send notifications");
      } else if (err.code === "functions/permission-denied") {
        Alert.alert("Error", "You don't have permission to send notifications");
      } else if (err.code === "functions/resource-exhausted") {
        Alert.alert("Cooldown Active", err.message);
      } else {
        Alert.alert("⚠️ Error", err.message || "Failed to send notifications");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="always"
      contentContainerStyle={{ flexGrow: 1, backgroundColor: colors.background }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>📢 Stadium Takeover</Text>

        {/* User Count */}
        <View style={styles.infoRow}>
          <View>
            <Text style={styles.infoTitle}>Users</Text>
            <Text style={styles.infoSubtitle}>
              Total users who have enabled {"\n"} push notifications
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <User color={colors.primary} />
            <Text style={styles.infoCount}>{tokensCount}</Text>
          </View>
        </View>

        {/* Notification Title */}
        <Text style={styles.label}>Notification Title</Text>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Stadium Takeover"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Video Picker */}
        <Text style={styles.label}>Select Video(s)</Text>
        <View style={styles.videoPickerContainer}>
          <Video color={colors.primary} />
          <SearchableDropdown
            options={videoOptions}
            placeholder={"-- Choose a Video --"}
            onSelect={(item) => {
              setSelectedVideos([...selectedVideos, item.file]);
              setTitle(`Stadium Takeover - ${item.name}`);
            }}
          />
        </View>

        <TouchableOpacity
          style={styles.uploadNewButton}
          onPress={() => uploadSheetRef.current?.present()}
        >
          <Text style={styles.uploadNewText}>+ Upload New Video</Text>
        </TouchableOpacity>

        {/* Selected Videos List */}
        <View style={styles.userIdList}>
          {selectedVideos.map((v, index) => {
            const option = videoOptions.find((opt) => opt.file === v);
            const videoName = option?.name || v;
            const newOnly = option ? !option.legacy : false;
            return (
              <View key={index} style={styles.userIdChip}>
                <Text style={styles.userIdText}>
                  {index + 1}. {videoName}
                  {newOnly ? " (new app only)" : ""}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedVideos(
                      selectedVideos.filter((_, i) => i !== index)
                    );
                  }}
                >
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Delay Slider */}
        <Text style={styles.label}>Delay: {delay} seconds</Text>
        <Slider
          style={{ width: "100%", height: 40 }}
          minimumValue={10}
          maximumValue={180}
          step={5}
          value={delay}
          onValueChange={setDelay}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />

        {/* Geo-Targeting */}
        <GeoTargetingSection
          enabled={geoEnabled}
          onEnabledChange={setGeoEnabled}
          mode={geoMode}
          onModeChange={setGeoMode}
          radiusMeters={radiusMeters}
          onRadiusChange={setRadiusMeters}
          center={geoCenter}
          onCenterChange={setGeoCenter}
          estimatedReach={estimatedReach}
          reachLoading={reachLoading}
        />

        {/* Admin Only Toggle */}
        {/* <View style={styles.infoRow}>
          <View>
            <Text style={styles.infoTitle}>Admin Only</Text>
            <Text style={styles.infoSubtitle}>
              Send notifications to yourself only
            </Text>
          </View>
          <Switch
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={isEnabled ? colors.onPrimary : colors.surfaceVariant}
            onValueChange={toggleSwitch}
            value={isEnabled}
          />
        </View> */}

        {/* Custom Users Toggle */}
        <View style={styles.infoRow}>
          <View>
            <Text style={styles.infoTitle}>Custom Users only</Text>
            <Text style={styles.infoSubtitle}>
              Send notifications to selected users only
            </Text>
          </View>
          <Switch
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={customUsers ? colors.onPrimary : colors.surfaceVariant}
            ios_backgroundColor={colors.border}
            onValueChange={toggleSwitch2}
            value={customUsers}
          />
        </View>

        {/* Custom Users Input */}
        {customUsers && (
          <>
            <Text style={styles.title}>{customUsersToken.length} users</Text>
            <View style={styles.inputRow}>
              <TextInput
                placeholder="Enter User ID"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  if (token.trim()) {
                    setCustomUsersToken([...customUsersToken, token.trim()]);
                    setToken("");
                  }
                }}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal>
              {customUsersToken.length > 0 && (
                <View style={styles.userIdList}>
                  {customUsersToken.map((userId, index) => (
                    <View key={index} style={styles.userIdChip}>
                      <Text
                        ellipsizeMode="tail"
                        numberOfLines={1}
                        style={[styles.userIdText, { maxWidth: 100 }]}
                      >
                        {userId}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setCustomUsersToken(
                            customUsersToken.filter((_, i) => i !== index)
                          );
                        }}
                      >
                        <Text style={styles.removeButton}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </>
        )}

        {/* Send Button */}
        <View style={{ marginTop: 20 }}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSend}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Sending..." : "Send Notification"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
    <VideoUploadSheet ref={uploadSheetRef} onUploaded={loadVideoOptions} />
    </>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: colors.background,
    },
    title: {
      ...typography.h2,
      color: colors.text,
      marginBottom: 20,
    },
    infoRow: {
      flexDirection: "row",
      padding: 10,
      alignItems: "center",
      justifyContent: "space-between",
    },
    infoTitle: {
      ...typography.title,
      color: colors.text,
    },
    infoSubtitle: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    infoCount: {
      ...typography.title,
      color: colors.text,
      marginLeft: 5,
    },
    label: {
      ...typography.subtitle,
      color: colors.text,
      marginTop: 15,
    },
    videoPickerContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 8,
      borderColor: colors.primary,
      padding: 10,
    },
    uploadNewButton: {
      alignSelf: "flex-start",
      paddingVertical: 8,
      paddingHorizontal: 2,
    },
    uploadNewText: {
      ...typography.body,
      color: colors.primary,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      paddingHorizontal: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      ...typography.body,
      flex: 1,
      paddingVertical: 12,
      color: colors.text,
    },
    addButton: {
      backgroundColor: colors.primary,
      padding: 12,
      margin: 5,
      borderRadius: 8,
    },
    addButtonText: {
      ...typography.label,
      color: colors.onPrimary,
    },
    button: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.primary,
      textAlign: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      paddingVertical: 16,
      borderRadius: 10,
      alignItems: "center",
      marginBottom: 12,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      ...typography.button,
      color: colors.primary,
    },
    userIdList: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginVertical: 10,
    },
    userIdChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginRight: 8,
      marginBottom: 8,
    },
    userIdText: {
      ...typography.bodySmall,
      color: colors.onPrimary,
      marginRight: 6,
    },
    removeButton: {
      ...typography.title,
      color: colors.onPrimary,
    },
  });
