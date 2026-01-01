import { RouteProp, useRoute } from "@react-navigation/native";
import { useEvent, useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import COLORS from "../components/colors";
import { useNavigation } from "expo-router";
import { triggerUniqueVibration } from "../../utils/vibrationHelper";
import BackButton from "@/components/ui/backbutton";
import { SafeAreaView } from "react-native-safe-area-context";
import { timeSync } from "@/services/timeSync";
import { Image } from "expo-image";
import { useSharedValue } from "react-native-reanimated";
import Carousel, {
  ICarouselInstance,
  Pagination,
} from "react-native-reanimated-carousel";
import { TouchableOpacity } from "react-native-gesture-handler";
const width = Dimensions.get("window").width;
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type VideoScreenRouteParams = {
  videoFile: string;
  sentAt: string;
  delaySeconds: string;
  playAt: string;
};

const videoMap = {
  "1.mp4": require("../../assets/videos/1.mp4"),
  "2.mp4": require("../../assets/videos/2.mp4"),
  "3.mp4": require("../../assets/videos/3.mp4"),
  "4.mp4": require("../../assets/videos/4.mp4"),
  "5.mp4": require("../../assets/videos/5.mp4"),
  //"6.mp4": require("../../assets/videos/6.mp4"),
  "7.mp4": require("../../assets/videos/7.mp4"),
  // "8.mp4": require("../../assets/videos/8.mp4"),
  // "9.mp4": require("../../assets/videos/9.mp4"),
  "10.mp4": require("../../assets/videos/10.mp4"),
  //  "11.mp4": require("../../assets/videos/11.mp4"),
  //  "12.mp4": require("../../assets/videos/12.mp4"),
  // "13.mp4": require("../../assets/videos/13.mp4"),
  "14.mp4": require("../../assets/videos/14.mp4"),
  "15.mp4": require("../../assets/videos/15.mp4"),
  "16.mp4": require("../../assets/videos/16.mp4"),
  "17.mp4": require("../../assets/videos/17.mp4"),
  "18.mp4": require("../../assets/videos/18.mp4"),
};

function isValidVideoFile(file: string): file is keyof typeof videoMap {
  return Object.prototype.hasOwnProperty.call(videoMap, file);
}

export default function VideoScreen() {
  const route =
    useRoute<RouteProp<Record<string, VideoScreenRouteParams>, string>>();
  const params = route.params;
  const { navigate } = useNavigation<any>();

  const [countdown, setCountdown] = useState<number | null>(null);
  const [missed, setMissed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
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
  // Extract params safely with defaults
  const videoFileParam = params?.videoFile;
  const playAt = params?.playAt;

  // Create playlist
  const playlist = videoFileParam ? videoFileParam.split(",") : [];
  const currentVideoFile = playlist[currentVideoIndex];

  // Always initialize player (with a default or null check)
  const assetId =
    currentVideoFile && isValidVideoFile(currentVideoFile)
      ? videoMap[currentVideoFile]
      : null;

  const player = useVideoPlayer(assetId, (player) => {
    if (player) {
      player.loop = false;
      // Auto-play if we are moving to next video in playlist (index > 0)
      if (currentVideoIndex > 0) {
        player.play();
      }
    }
  });

  useEventListener(player, "playToEnd", () => {
    if (currentVideoIndex < playlist.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    } else {
      navigate("Home");
    }
  });

  // Validate params and set errors
  useEffect(() => {
    if (!params) {
      setError("Missing parameters.");
      return;
    }

    if (!playlist.length || !playlist.some(isValidVideoFile)) {
      setError("Invalid or missing video file(s).");
      return;
    }

    if (!playAt) {
      setError("Missing playAt timestamp parameter.");
      return;
    }

    // Clear any previous errors
    setError(null);
  }, [params, videoFileParam, playAt]);

  // Sync countdown with server timestamp
  useEffect(() => {
    if (error || !playAt) return;

    const targetTimestamp = parseInt(playAt, 10);

    const updateCountdown = () => {
      //const now = Date.now();
      const now = timeSync.getSyncedTime();
      const remaining = Math.floor((targetTimestamp - now) / 1000);

      if (remaining > 0) {
        setCountdown(remaining);
      } else if (remaining >= -5) {
        // Allow 5 second grace period
        setCountdown(0);
        setVideoReady(true);
        if (player) {
          player.play();
        }
      } else {
        setMissed(true);
      }
    };

    // Update immediately
    updateCountdown();

    // Update every 100ms for smooth countdown
    const interval = setInterval(updateCountdown, 100);

    return () => clearInterval(interval);
  }, [playAt, player, error]);

  // Handle vibration at 5 seconds
  useEffect(() => {
    if (countdown === 5) {
      triggerUniqueVibration();
    }
  }, [countdown]);

  // // Render error state
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <BackButton />
        <View style={styles.contentContainer}>
          <Text
            style={{ color: COLORS.text, fontSize: 18, textAlign: "center" }}
          >
            {error}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const dataAd = [
    {
      id: 1,
      url: require("../../assets/ads/1.jpg"),
    },
    {
      id: 2,
      url: require("../../assets/ads/2.jpg"),
    },
    {
      id: 3,
      url: require("../../assets/ads/3.jpg"),
    },
    {
      id: 4,
      url: require("../../assets/ads/4.jpg"),
    },
    {
      id: 5,
      url: require("../../assets/ads/5.jpg"),
    },
  ];
  const defaultData = [
    {
      id: 1,
      url: require("../../assets/defaultAds/1.jpeg"),
    },
    {
      id: 2,
      url: require("../../assets/defaultAds/2.jpeg"),
    },
    {
      id: 3,
      url: require("../../assets/defaultAds/3.jpeg"),
    },
  ];
  console.log("assetId:", assetId);
  const data = currentVideoFile === "10.mp4" ? dataAd : defaultData;
  const w = Dimensions.get("window").width;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
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
        {missed && !player.playing ? (
          <View style={styles.countdownOverlay}>
            <Text style={styles.restricted}>You missed the video.</Text>
          </View>
        ) : countdown && countdown > 0 ? (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownText}>{countdown}</Text>
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
          dotStyle={{ backgroundColor: COLORS.primary, borderRadius: 50 }}
          containerStyle={{ gap: 5, marginTop: 10 }}
          onPress={onPressPagination}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
    color: COLORS.text,
    fontWeight: "bold",
  },
  restricted: {
    fontSize: 20,
    color: COLORS.text,
    textAlign: "center",
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
