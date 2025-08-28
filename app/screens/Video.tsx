import { RouteProp, useRoute } from "@react-navigation/native";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import COLORS from "../components/colors";
import { useNavigation } from "expo-router";
import { triggerUniqueVibration } from "../../utils/vibrationHelper";
import BackButton from "@/components/ui/backbutton";
import { SafeAreaView } from "react-native-safe-area-context";
import { timeSync } from "@/services/timeSync";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type VideoScreenRouteParams = {
  videoFile: string;
  sentAt: string;
  delaySeconds: string;
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
  // "14.mp4": require("../../assets/videos/14.mp4"),
  // "15.mp4": require("../../assets/videos/15.mp4"),
};

function isValidVideoFile(file: string): file is keyof typeof videoMap {
  return Object.prototype.hasOwnProperty.call(videoMap, file);
}

export default function VideoScreen() {
  const route =
    useRoute<RouteProp<Record<string, VideoScreenRouteParams>, string>>();
  const params = route.params;
  const { navigate } = useNavigation();

  const [countdown, setCountdown] = useState<number | null>(null);
  const [missed, setMissed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract params safely with defaults
  const videoFile = params?.videoFile;
  const playAt = params?.playAt;

  // Always initialize player (with a default or null check)
  const assetId =
    videoFile && isValidVideoFile(videoFile) ? videoMap[videoFile] : null;
  const player = useVideoPlayer(assetId, (player) => {
    if (player) {
      player.loop = false;
    }
  });

  useEventListener(player, "playToEnd", () => {
    navigate("Home");
  });

  // Validate params and set errors
  useEffect(() => {
    if (!params) {
      setError("Missing parameters.");
      return;
    }

    if (!videoFile || !isValidVideoFile(videoFile)) {
      setError("Invalid or missing video file.");
      return;
    }

    if (!playAt) {
      setError("Missing playAt timestamp parameter.");
      return;
    }

    // Clear any previous errors
    setError(null);
  }, [params, videoFile, playAt]);

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

  // Render error state
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.contentContainer}>
        <View style={styles.videoWrapper}>
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
    width: screenWidth,
    height: screenHeight,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
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
    color: COLORS.text,
    fontWeight: "bold",
  },
  restricted: {
    fontSize: 20,
    color: COLORS.text,
    textAlign: "center",
  },
});
