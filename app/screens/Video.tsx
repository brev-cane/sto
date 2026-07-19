import { RouteProp, useRoute } from "@react-navigation/native";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import { useAppNavigation } from "@/types/navigation";
import { triggerUniqueVibration } from "../../utils/vibrationHelper";
import BackButton from "@/components/ui/backbutton";
import { SafeAreaView } from "react-native-safe-area-context";
import { timeSync } from "@/services/timeSync";
import { videoSync } from "@/services/videoSync";
import { MediaType, VideoDownloadProgress } from "@/types/videos";
import { CatalogBanner } from "@/types/banners";
import { collection, getDocs, query, where } from "firebase/firestore";
import { FIRESTORE_DB } from "@/FirebaseConfig";
import { Music } from "lucide-react-native";
import { Image } from "expo-image";
import { useSharedValue } from "react-native-reanimated";
import Carousel, {
  ICarouselInstance,
  Pagination,
} from "react-native-reanimated-carousel";
const width = Dimensions.get("window").width;
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type VideoScreenRouteParams = {
  videoFile?: string;
  videoIds?: string;
  sentAt?: string;
  delaySeconds?: string;
  playAt: string;
};

type PlaylistEntry = {
  id: string;
  name: string;
  durationSec: number;
  mediaType: MediaType;
  thumbnailURL?: string;
  legacyFileName?: string;
  /** Local file URI once downloaded, null while still remote */
  uri: string | null;
};

type Phase =
  | "resolving"
  | "downloading"
  | "countdown"
  | "playing"
  | "missed"
  | "error";

/** Maps seconds elapsed since playAt to a playlist position, for joining late but in sync. */
function locateInPlaylist(
  elapsedSec: number,
  entries: PlaylistEntry[]
): { index: number; offsetSec: number } | null {
  let start = 0;
  for (let i = 0; i < entries.length; i++) {
    const duration = entries[i].durationSec || 0;
    if (elapsedSec < start + duration) {
      return { index: i, offsetSec: Math.max(0, elapsedSec - start) };
    }
    start += duration;
  }
  return null;
}

export default function VideoScreen() {
  const route =
    useRoute<RouteProp<Record<string, VideoScreenRouteParams>, string>>();
  const params = route.params;
  const { navigate } = useAppNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [phase, setPhase] = useState<Phase>("resolving");
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [entries, setEntries] = useState<PlaylistEntry[] | null>(null);
  const [downloadProgress, setDownloadProgress] =
    useState<VideoDownloadProgress | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [banners, setBanners] = useState<CatalogBanner[] | null>(null);

  const pendingSeekRef = useRef(0);

  const ref = useRef<ICarouselInstance>(null);
  const progress = useSharedValue<number>(0);

  const onPressPagination = (index: number) => {
    ref.current?.scrollTo({
      /**
       * Calculate the difference between the current index and the target index
       * to ensure that the carousel scrolls to the nearest index
       */
      count: index - progress.value,
      animated: true,
    });
  };

  const playAt = params?.playAt;
  // New pushes carry catalog ids in videoIds; older payloads carry videoFile,
  // whose legacy filenames double as catalog doc ids for the seeded videos.
  const playlistIds = (params?.videoIds ?? params?.videoFile ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const currentUri = entries?.[currentVideoIndex]?.uri ?? null;
  const player = useVideoPlayer(
    currentUri ? { uri: currentUri } : null,
    (player) => {
      if (player) player.loop = false;
    }
  );

  // Once we're in the playing phase, every (re)created player — initial start,
  // playlist advance, late-join into a later video — starts playback here,
  // applying a pending late-join seek first.
  useEffect(() => {
    if (phase !== "playing" || !player) return;
    if (pendingSeekRef.current > 0) {
      player.currentTime = pendingSeekRef.current;
      pendingSeekRef.current = 0;
    }
    player.play();
  }, [phase, player, currentVideoIndex]);

  useEventListener(player, "playToEnd", () => {
    if (entries && currentVideoIndex < entries.length - 1) {
      const nextIndex = currentVideoIndex + 1;
      const nextEntry = entries[nextIndex];

      // Background prefetch may not have finished (or failed); without a
      // local file there is nothing to play in sync, so leave.
      if (!nextEntry.uri) {
        navigate("Main");
        return;
      }

      // If the next video is the same as current, we need to seek to beginning and replay
      // because useVideoPlayer won't reinitialize with the same source
      if (nextEntry.uri === entries[currentVideoIndex].uri && player) {
        player.currentTime = 0;
        player.play();
      }

      setCurrentVideoIndex(nextIndex);
    } else {
      navigate("Main");
    }
  });

  // Resolve playlist ids against the local store / catalog, then make sure the
  // video we need first is on disk — downloading it with visible progress.
  useEffect(() => {
    if (!params) {
      setError("Missing parameters.");
      setPhase("error");
      return;
    }
    if (!playlistIds.length) {
      setError("Invalid or missing video file(s).");
      setPhase("error");
      return;
    }
    if (!playAt) {
      setError("Missing playAt timestamp parameter.");
      setPhase("error");
      return;
    }

    const abort = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        // 1. Metadata (name/duration) for every playlist entry
        const resolved: PlaylistEntry[] = [];
        for (const id of playlistIds) {
          const manifestEntry = await videoSync.getManifestEntry(id);
          if (manifestEntry) {
            resolved.push({
              id,
              name: manifestEntry.name,
              durationSec: manifestEntry.durationSec,
              mediaType: manifestEntry.mediaType ?? "video",
              thumbnailURL: manifestEntry.thumbnailURL,
              legacyFileName: manifestEntry.legacyFileName,
              uri: await videoSync.getLocalUri(id),
            });
            continue;
          }
          const catalogVideo = await videoSync.getCatalogVideo(id);
          if (!catalogVideo || catalogVideo.status !== "ready") {
            throw new Error("Invalid or missing video file(s).");
          }
          resolved.push({
            id,
            name: catalogVideo.name,
            durationSec: catalogVideo.durationSec,
            mediaType: catalogVideo.mediaType ?? "video",
            thumbnailURL: catalogVideo.thumbnailURL,
            legacyFileName: catalogVideo.legacyFileName,
            uri: null,
          });
        }
        if (cancelled) return;
        setEntries(resolved);

        // 2. Which file do we need first? Index 0 normally; a later index
        // when joining after playAt.
        const elapsedSec =
          (timeSync.getSyncedTime() - parseInt(playAt, 10)) / 1000;
        const location =
          elapsedSec > 5 ? locateInPlaylist(elapsedSec, resolved) : null;
        if (elapsedSec > 5 && !location) {
          // The whole playlist already finished — countdown effect will show
          // "missed", no download needed.
          setPhase("countdown");
          return;
        }
        const targetIndex = location?.index ?? 0;

        // 3. Download the target with progress, then let the countdown take
        // over; remaining entries keep downloading in the background.
        if (!resolved[targetIndex].uri) {
          setPhase("downloading");
          const uri = await videoSync.ensureVideo(
            resolved[targetIndex].id,
            (p) => {
              if (!cancelled) setDownloadProgress(p);
            },
            abort.signal
          );
          if (cancelled) return;
          resolved[targetIndex] = { ...resolved[targetIndex], uri };
          setEntries([...resolved]);
        }

        for (const [i, entry] of resolved.entries()) {
          if (i === targetIndex || entry.uri) continue;
          videoSync
            .ensureVideo(entry.id)
            .then((uri) => {
              if (cancelled) return;
              setEntries((prev) => {
                if (!prev) return prev;
                const next = [...prev];
                next[i] = { ...next[i], uri };
                return next;
              });
            })
            .catch((err) =>
              console.log(`Prefetch failed for ${entry.id}:`, err)
            );
        }

        setPhase("countdown");
      } catch (err: any) {
        if (cancelled || err?.name === "AbortError") return;
        console.log("Video preparation failed:", err);
        setError(
          err?.message === "Invalid or missing video file(s)."
            ? err.message
            : "Could not download the video. Check your connection and try again."
        );
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.videoIds, params?.videoFile, playAt]);

  // Sync countdown with server timestamp; on expiry either play from the
  // start (grace period) or join late at the in-sync offset.
  useEffect(() => {
    if (phase !== "countdown" || !playAt || !entries) return;

    const targetTimestamp = parseInt(playAt, 10);

    const startPlayback = (index: number, offsetSec: number) => {
      pendingSeekRef.current = offsetSec;
      setCountdown(0);
      setCurrentVideoIndex(index);
      // The play effect picks it up from here (and applies the seek)
      setPhase("playing");
    };

    const updateCountdown = () => {
      const now = timeSync.getSyncedTime();
      const remaining = Math.floor((targetTimestamp - now) / 1000);

      if (remaining > 0) {
        setCountdown(remaining);
        return;
      }

      const elapsedSec = (now - targetTimestamp) / 1000;
      if (elapsedSec <= 5) {
        // Grace period: start from the beginning
        if (entries[0].uri) startPlayback(0, 0);
        return;
      }

      const location = locateInPlaylist(elapsedSec, entries);
      if (!location) {
        setPhase("missed");
        return;
      }
      // Join in sync mid-playlist once the needed file is on disk
      if (entries[location.index].uri) {
        startPlayback(location.index, location.offsetSec);
      }
    };

    // Update immediately
    updateCountdown();

    // Update every 100ms for smooth countdown
    const interval = setInterval(updateCountdown, 100);

    return () => clearInterval(interval);
  }, [phase, playAt, entries, player]);

  useEffect(() => {
    if (countdown === 5) {
      triggerUniqueVibration();
    }
  }, [countdown]);

  // Load the admin-managed banner catalog once per takeover — the fetch lands
  // during the countdown window and the set must not change mid-show. On
  // failure `banners` stays null and the bundled fallback ads render instead.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(FIRESTORE_DB, "banners"),
            where("status", "==", "ready"),
            where("active", "==", true)
          )
        );
        if (cancelled) return;
        setBanners(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as CatalogBanner)
        );
      } catch (error) {
        console.log("Failed to load banners, using bundled ads:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <BackButton />
        <View style={styles.contentContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Bundled fallback ads, shown only when no remote banners apply (offline
  // before the catalog was cached, fetch failure, or an empty catalog).
  const defaultData = [
    {
      id: "bundled-1",
      url: require("../../assets/defaultAds/1.jpeg"),
    },
    {
      id: "bundled-2",
      url: require("../../assets/defaultAds/2.jpeg"),
    },
    {
      id: "bundled-3",
      url: require("../../assets/defaultAds/3.jpeg"),
    },
  ];
  // Banners assigned to the playing video win; banners with no assignment are
  // the admin's default set. Recomputed per playlist item.
  const currentVideoId = entries?.[currentVideoIndex]?.id;
  const assignedBanners =
    banners?.filter(
      (b) => currentVideoId && b.videoIds?.includes(currentVideoId)
    ) ?? [];
  const defaultBanners = banners?.filter((b) => !b.videoIds?.length) ?? [];
  const remoteBanners = (
    assignedBanners.length ? assignedBanners : defaultBanners
  )
    .filter((b) => b.downloadURL)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const data = remoteBanners.length
    ? remoteBanners.map((b) => ({ id: b.id, url: { uri: b.downloadURL! } }))
    : defaultData;
  const w = Dimensions.get("window").width;

  const downloadPercent =
    downloadProgress && downloadProgress.totalBytes > 0
      ? Math.min(
          100,
          Math.round(
            (downloadProgress.bytesWritten / downloadProgress.totalBytes) * 100
          )
        )
      : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <VideoView
          style={styles.video}
          nativeControls={false}
          player={player}
        />
        {entries?.[currentVideoIndex]?.mediaType === "audio" && (
          <View style={styles.audioArt}>
            {entries[currentVideoIndex].thumbnailURL ? (
              <Image
                source={{ uri: entries[currentVideoIndex].thumbnailURL }}
                contentFit="cover"
                style={styles.audioArtImage}
              />
            ) : (
              <Music size={96} color={colors.primary} />
            )}
          </View>
        )}
        {phase === "missed" ? (
          <View style={styles.countdownOverlay}>
            <Text style={styles.restricted}>You missed the video.</Text>
          </View>
        ) : phase === "downloading" ? (
          <View style={styles.countdownOverlay}>
            <Text style={styles.restricted}>
              This video isn&apos;t on your phone yet.{"\n"}Downloading it
              now…
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${downloadPercent ?? 0}%` },
                ]}
              />
            </View>
            {downloadPercent !== null && (
              <Text style={styles.progressLabel}>{downloadPercent}%</Text>
            )}
          </View>
        ) : phase === "countdown" && countdown !== null && countdown > 0 ? (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        ) : phase === "resolving" ? (
          <View style={styles.countdownOverlay}>
            <Text style={styles.restricted}>Getting ready…</Text>
          </View>
        ) : null}
      </View>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Carousel
          ref={ref}
          style={{ width, height: width / 2 }}
          data={data}
          width={width}
          loop
          autoPlay
          autoPlayInterval={2000}
          onProgressChange={progress}
          renderItem={({ index, item }) => (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <Image
                source={item.url}
                contentFit="contain"
                style={{
                  width: w,
                  height: 300,
                  borderRadius: 30,
                  overflow: "hidden",
                }}
              />
            </View>
          )}
        />

        <Pagination.Basic
          progress={progress}
          data={data}
          dotStyle={{ backgroundColor: colors.primary, borderRadius: 50 }}
          containerStyle={{ gap: 5, marginTop: 10 }}
          onPress={onPressPagination}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  contentContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    ...typography.title,
    color: colors.text,
    textAlign: "center",
  },
  videoWrapper: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: 300,
  },
  // Covers the (empty) VideoView while an audio-only entry plays
  audioArt: {
    position: "absolute",
    width: "100%",
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  audioArtImage: {
    width: "100%",
    height: "100%",
  },
  countdownOverlay: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    width: screenWidth,
    height: screenHeight,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  countdownText: {
    fontSize: 72,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  restricted: {
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "center",
  },
  progressTrack: {
    width: screenWidth * 0.7,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginTop: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  progressLabel: {
    marginTop: 8,
    fontSize: 14,
    color: "#FFFFFF",
  },
  controlsOverlay: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  controlButton: {
    padding: 10,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
});
