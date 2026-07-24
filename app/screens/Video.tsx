import {
  RouteProp,
  useFocusEffect,
  useIsFocused,
  useRoute,
} from "@react-navigation/native";
import { VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import { useAppNavigation } from "@/types/navigation";
import BackButton from "@/components/ui/backbutton";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  TakeoverParams,
  useTakeoverPlayer,
} from "@/contexts/takeoverPlayerContext";
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

export default function VideoScreen() {
  const route = useRoute<RouteProp<Record<string, TakeoverParams>, string>>();
  const params = route.params;
  const { navigate } = useAppNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isFocused = useIsFocused();

  const {
    sessionParams,
    phase,
    error,
    countdown,
    entries,
    currentIndex,
    downloadProgress,
    player,
    startSession,
    resync,
    setVideoScreenFocused,
  } = useTakeoverPlayer();

  const [banners, setBanners] = useState<CatalogBanner[] | null>(null);

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

  // Hand the takeover over to the global provider. Idempotent when this is a
  // restore from the mini-player (same playAt), a fresh session otherwise.
  useEffect(() => {
    startSession(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.playAt, params?.videoIds, params?.videoFile]);

  // Tell the provider when the full screen owns the session (hides the
  // mini-player) and catch up with the server clock on every return.
  useFocusEffect(
    useCallback(() => {
      setVideoScreenFocused(true);
      resync();
      return () => setVideoScreenFocused(false);
    }, [setVideoScreenFocused, resync])
  );

  // When the session ends while we're the visible screen (playlist finished),
  // leave the way the old screen did. Ends while minimized don't navigate.
  const hadSessionRef = useRef(false);
  useEffect(() => {
    if (hadSessionRef.current && !sessionParams && isFocused) {
      navigate("Main");
    }
    hadSessionRef.current = !!sessionParams;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionParams, isFocused]);

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
        {/* Popping blurs the screen; the provider then auto-ends the errored session */}
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
  const currentVideoId = entries?.[currentIndex]?.id;
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
        {entries?.[currentIndex]?.mediaType === "audio" && (
          <View style={styles.audioArt}>
            {entries[currentIndex].thumbnailURL ? (
              <Image
                source={{ uri: entries[currentIndex].thumbnailURL }}
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
        ) : phase === "resolving" || phase === "idle" ? (
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
