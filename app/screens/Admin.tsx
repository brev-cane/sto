import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import * as Sentry from "@sentry/react-native";
import Slider from "@react-native-community/slider";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useAuth } from "@/contexts/authContext";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import {
  ChevronDown,
  Clock,
  FolderCog,
  RefreshCw,
  GalleryHorizontal,
  ImagePlus,
  Send,
  Upload,
  Users,
  Video,
  X,
} from "lucide-react-native";
import SearchableDropdown from "@/components/ui/searchableDropDown";
import GeoTargetingSection from "@/components/ui/geoTargetingSection";
import { httpsCallable } from "firebase/functions";
import { collection, getDocs, query, where } from "firebase/firestore";
import { functions, FIREBASE_AUTH, FIRESTORE_DB } from "@/FirebaseConfig";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import VideoUploadSheet from "@/components/ui/videoUploadSheet";
import { formatCount } from "@/utils/formatHelper";
import ManageMediaSheet from "@/components/ui/manageMediaSheet";
import BannerUploadSheet from "@/components/ui/bannerUploadSheet";
import ManageBannersSheet from "@/components/ui/manageBannersSheet";
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
  mediaType: "video" | "audio";
  /** Playable on old app builds that still bundle this video */
  legacy: boolean;
  createdAtMs: number;
};

export default function AdminScreen() {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [videoOptions, setVideoOptions] = useState<VideoOption[]>([]);
  const uploadSheetRef = useRef<TrueSheet>(null);
  const manageSheetRef = useRef<TrueSheet>(null);
  const bannerUploadSheetRef = useRef<TrueSheet>(null);
  const manageBannersSheetRef = useRef<TrueSheet>(null);
  const [delay, setDelay] = useState(30);
  const [loading, setLoading] = useState(false);
  const [tokensCount, setTokensCount] = useState(0);
  const { userDoc } = useAuth(); // Add 'user' from auth context
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
  const [refreshingAudience, setRefreshingAudience] = useState(false);
  // Bumped by refreshAudience so the reach-preview effect re-runs against the
  // freshly rebuilt server-side cache
  const [reachNonce, setReachNonce] = useState(0);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Stats are cached server-side for 24h; forceRefresh recounts and also
  // rebuilds the notifiable-user cache used by reach previews and sends.
  const countUsers = async (forceRefresh = false) => {
    try {
      // Check if user is authenticated first
      const currentUser = FIREBASE_AUTH.currentUser;
      if (!currentUser) {
        console.log("User not authenticated yet");
        return;
      }

      const getUserStats = httpsCallable(functions, "getUserStats");
      const result = await getUserStats(
        forceRefresh ? { forceRefresh: true } : {}
      );
      const data = result.data as any;

      if (data.success) {
        setTokensCount(data.pushEnabledUsers);
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

  // Manual cache bust: fresh audience count + fresh user locations, then
  // re-estimate reach against the rebuilt cache.
  const refreshAudience = async () => {
    if (refreshingAudience) return;
    setRefreshingAudience(true);
    try {
      await countUsers(true);
      setReachNonce((n) => n + 1);
    } finally {
      setRefreshingAudience(false);
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
            name: (data.mediaType === "audio" ? "♪ " : "") + (data.name ?? docSnap.id),
            thumbnailURL: data.thumbnailURL,
            mediaType: data.mediaType ?? "video",
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

  // Reach preview: one invocation per chosen location + mode. Radius still
  // doesn't affect the histogram (the 100m-bucketed distances cover every
  // radius), but mode does now — opted-in-without-location users only
  // bypass the location filter on "outside" sends, so we must refetch when
  // the admin flips WITHIN/OUTSIDE rather than reusing the old histogram.
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
              mode: geoMode,
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
  }, [geoEnabled, geoCenter, geoMode, reachNonce]);

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
        {/* Header */}
        <Text style={styles.title}>📢 Stadium Takeover</Text>
        <Text style={styles.subtitle}>
          Compose and send a takeover alert to fans
        </Text>

        {/* Audience */}
        <View style={styles.section}>
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.iconTile}>
              <Users size={17} color={colors.primary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Reachable users</Text>
              <Text style={styles.rowDescription}>
                Have push notifications enabled · cached up to 24h
              </Text>
            </View>
            <Text style={styles.audienceCount}>{formatCount(tokensCount)}</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={refreshAudience}
              disabled={refreshingAudience}
            >
              {refreshingAudience ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <RefreshCw size={16} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification */}
        <Text style={styles.sectionHeader}>Notification</Text>
        <View style={styles.section}>
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowBody}>
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                placeholder="Stadium Takeover"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
                value={title}
                onChangeText={setTitle}
              />
            </View>
          </View>
        </View>

        {/* Media */}
        <Text style={styles.sectionHeader}>Media</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.iconTile}>
              <Video size={17} color={colors.primary} />
            </View>
            <View style={styles.dropdownWrapper}>
              <SearchableDropdown
                options={videoOptions}
                placeholder={"Choose a video…"}
                onSelect={(item) => {
                  setSelectedVideos([...selectedVideos, item.file]);
                  setTitle(`Stadium Takeover - ${item.name}`);
                }}
              />
            </View>
            <ChevronDown size={16} color={colors.textMuted} />
          </View>

          {/* Selected media list */}
          {selectedVideos.length === 0 ? (
            <View style={styles.row}>
              <Text style={styles.emptyText}>No media selected yet</Text>
            </View>
          ) : (
            selectedVideos.map((v, index) => {
              const option = videoOptions.find((opt) => opt.file === v);
              const videoName = option?.name || v;
              const newOnly = option ? !option.legacy : false;
              return (
                <View key={index} style={styles.row}>
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>{index + 1}</Text>
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {videoName}
                    </Text>
                    {newOnly && (
                      <Text style={styles.newOnlyText}>
                        Latest app version only
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => {
                      setSelectedVideos(
                        selectedVideos.filter((_, i) => i !== index)
                      );
                    }}
                  >
                    <X size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          {/* Media actions */}
          <View style={styles.mediaActionsRow}>
            <TouchableOpacity
              style={styles.mediaAction}
              onPress={() => uploadSheetRef.current?.present()}
            >
              <Upload size={16} color={colors.primary} />
              <Text style={styles.mediaActionText}>Upload media</Text>
            </TouchableOpacity>
            <View style={styles.mediaActionDivider} />
            <TouchableOpacity
              style={styles.mediaAction}
              onPress={() => manageSheetRef.current?.present()}
            >
              <FolderCog size={16} color={colors.primary} />
              <Text style={styles.mediaActionText}>Manage media</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Carousel banners */}
        <Text style={styles.sectionHeader}>Carousel Banners</Text>
        <View style={styles.section}>
          <View style={styles.mediaActionsRow}>
            <TouchableOpacity
              style={styles.mediaAction}
              onPress={() => bannerUploadSheetRef.current?.present()}
            >
              <ImagePlus size={16} color={colors.primary} />
              <Text style={styles.mediaActionText}>Upload banner</Text>
            </TouchableOpacity>
            <View style={styles.mediaActionDivider} />
            <TouchableOpacity
              style={styles.mediaAction}
              onPress={() => manageBannersSheetRef.current?.present()}
            >
              <GalleryHorizontal size={16} color={colors.primary} />
              <Text style={styles.mediaActionText}>Manage banners</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery */}
        <Text style={styles.sectionHeader}>Delivery</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.iconTile}>
              <Clock size={17} color={colors.primary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Delay</Text>
              <Text style={styles.rowDescription}>
                Countdown before the takeover starts
              </Text>
            </View>
            <Text style={styles.delayValue}>{delay}s</Text>
          </View>
          <View style={styles.sliderWrapper}>
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
            <View style={styles.sliderScale}>
              <Text style={styles.sliderScaleText}>10s</Text>
              <Text style={styles.sliderScaleText}>180s</Text>
            </View>
          </View>
        </View>

        {/* Geo-Targeting */}
        <Text style={styles.sectionHeader}>Audience Filter</Text>
        <View style={[styles.section, styles.geoSection]}>
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
            onRefreshReach={refreshAudience}
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Send size={18} color={colors.onPrimary} />
          )}
          <Text style={styles.sendButtonText}>
            {loading ? "Sending…" : "Send Notification"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
    <VideoUploadSheet ref={uploadSheetRef} onUploaded={loadVideoOptions} />
    <ManageMediaSheet ref={manageSheetRef} onChanged={loadVideoOptions} />
    <BannerUploadSheet ref={bannerUploadSheetRef} videoOptions={videoOptions} />
    <ManageBannersSheet
      ref={manageBannersSheetRef}
      videoOptions={videoOptions}
    />
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
    },
    subtitle: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginTop: 2,
      marginBottom: 20,
    },
    sectionHeader: {
      ...typography.caption,
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
      marginLeft: 16,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginBottom: 22,
      overflow: "hidden",
    },
    geoSection: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 48,
      paddingLeft: 14,
      paddingRight: 12,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    iconTile: {
      width: 30,
      height: 30,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryMuted,
      marginRight: 12,
    },
    rowBody: {
      flex: 1,
      justifyContent: "center",
      paddingRight: 8,
    },
    rowTitle: {
      ...typography.body,
      color: colors.text,
    },
    rowDescription: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 1,
    },
    audienceCount: {
      ...typography.h3,
      color: colors.primary,
    },
    refreshButton: {
      marginLeft: 10,
      padding: 4,
    },
    fieldLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginTop: 2,
    },
    input: {
      ...typography.body,
      color: colors.text,
      paddingVertical: 6,
      paddingHorizontal: 0,
    },
    dropdownWrapper: {
      flex: 1,
      marginLeft: -12, // cancel SearchableDropdown's inner padding
    },
    emptyText: {
      ...typography.bodySmall,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    orderBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryMuted,
      marginRight: 12,
    },
    orderBadgeText: {
      ...typography.label,
      color: colors.primary,
    },
    newOnlyText: {
      ...typography.caption,
      color: colors.warning,
      marginTop: 1,
    },
    mediaActionsRow: {
      flexDirection: "row",
      alignItems: "stretch",
    },
    mediaAction: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
    },
    mediaActionDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    mediaActionText: {
      ...typography.label,
      color: colors.primary,
    },
    delayValue: {
      ...typography.title,
      color: colors.primary,
      fontVariant: ["tabular-nums"],
    },
    sliderWrapper: {
      paddingHorizontal: 14,
      paddingTop: 4,
      paddingBottom: 10,
    },
    sliderScale: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: -4,
    },
    sliderScaleText: {
      ...typography.caption,
      color: colors.textMuted,
    },
    sendButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 15,
      borderRadius: 12,
      marginTop: 2,
      marginBottom: 12,
    },
    sendButtonDisabled: {
      opacity: 0.6,
    },
    sendButtonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
  });
