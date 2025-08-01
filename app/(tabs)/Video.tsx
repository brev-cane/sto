import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { useRoute } from "@react-navigation/native"; // <-- To get route params
import COLORS from "../components/colors"; 
import { useNavigation } from "expo-router";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const assetId = require("../../assets/videos/1.mp4");

export default function VideoScreen() {
  const { params } = useRoute();
  const {navigate}=useNavigation()
  const [countdown, setCountdown] = useState<number | null>(null);
  const [missed, setMissed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const player = useVideoPlayer(assetId, (player) => {
    player.loop = false;
  }); 
  useEventListener(player, "playToEnd", () => {
   navigate("Home")
  }); 
  useEffect(() => {
    if (!params?.sentAt || !params?.delaySeconds) {
      console.warn("Missing sentAt or delaySeconds in route params.");
      return;
    }

    const sentAtTime = new Date(params.sentAt).getTime(); // ms
    const delay = parseInt(params.delaySeconds, 10) * 1000; // ms
    const targetTime = sentAtTime + delay;
    const now = Date.now();
    const remaining = Math.floor((targetTime - now) / 1000);

    if (remaining > 0) {
      setCountdown(remaining);
    } else {
      setMissed(true);
    }
  }, [params]);

  useEffect(() => {
    if (countdown === null || missed) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c! - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setVideoReady(true);
      player.play();
    }
  }, [countdown]);

  return (
    <View style={styles.contentContainer}>
      <View style={styles.videoWrapper} pointerEvents="none">
        <VideoView style={styles.video} player={player} />
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
