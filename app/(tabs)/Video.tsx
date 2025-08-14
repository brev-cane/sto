import { RouteProp, useRoute } from "@react-navigation/native";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import COLORS from "../components/colors";
import { useNavigation } from "expo-router";
import { triggerUniqueVibration } from "../../utils/vibrationHelper";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type VideoScreenRouteParams = {
  videoFile: string;
  sentAt: string;
  delaySeconds: string;
};

const videoMap = {
  // "test.mp4": require("../../assets/videos/test.mp4"),
  "1.mp4": require("../../assets/videos/1.mp4"),
  "5.mp4": require("../../assets/videos/5.mp4")
};

function isValidVideoFile(file: string): file is keyof typeof videoMap {
  return Object.prototype.hasOwnProperty.call(videoMap, file);
}

export default function VideoScreen() {
  const route = useRoute<RouteProp<Record<string, VideoScreenRouteParams>, string>>();
  const params = route.params;
  const { navigate } = useNavigation();

  const [countdown, setCountdown] = useState<number | null>(null);
  const [missed, setMissed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!params) {
    return (
      <View style={styles.contentContainer}>
        <Text style={{ color: '#000', fontSize: 18, textAlign: "center" }}>
          Missing parameters.
        </Text>
      </View>
    );
  }

  const { videoFile, sentAt, delaySeconds } = params;

  if (!videoFile || !isValidVideoFile(videoFile)) {
    return (
      <View style={styles.contentContainer}>
        <Text style={{ color: COLORS.text, fontSize: 18, textAlign: "center" }}>
          Invalid or missing video file.
        </Text>
      </View>
    );
  }

  const assetId = videoMap[videoFile];
  const player = useVideoPlayer(assetId, (player) => {
    player.loop = false;
  });

  useEventListener(player, "playToEnd", () => {
    navigate("Home");
  });

  useEffect(() => {
    if (!sentAt || !delaySeconds) {
      setError("Missing sentAt or delaySeconds parameters.");
      return;
    }

    const sentAtTime = new Date(sentAt).getTime();
    const delay = parseInt(delaySeconds, 10) * 1000;
    const targetTime = sentAtTime + delay;
    const now = Date.now();
    const remaining = Math.floor((targetTime - now) / 1000);

    if (remaining > 0) {
      setCountdown(remaining);
    } else {
      setMissed(true);
    }
  }, [sentAt, delaySeconds]);

  useEffect(() => {
    if (countdown === null || missed) return;
    if (countdown > 0) {
      if (countdown === 5) {
        triggerUniqueVibration(); // Vibrate at 5 seconds left
      }
      const timer = setTimeout(() => setCountdown((c) => c! - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setVideoReady(true);
      player.play();
    }
  }, [countdown]);

  if (error) {
    return (
      <View style={styles.contentContainer}>
        <Text style={{ color: COLORS.text, fontSize: 18, textAlign: "center" }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.contentContainer}>
      <View style={styles.videoWrapper}>
        <VideoView style={styles.video} nativeControls={false} player={player} />
        {missed ? (
          <View style={styles.countdownOverlay}>
            <Text style={styles.restricted}>You missed the video.</Text>
          </View>
        ) : countdown! > 0 ? (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        ) : null}
      </View>
    </View>
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
