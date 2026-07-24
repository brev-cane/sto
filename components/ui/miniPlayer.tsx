import { Image } from "expo-image";
import { VideoView } from "expo-video";
import { Music, X } from "lucide-react-native";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTakeoverPlayer } from "@/contexts/takeoverPlayerContext";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import { navigationRef } from "@/types/navigation";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const CARD_WIDTH = 180;
const CARD_HEIGHT = 102;
const EDGE_MARGIN = 12;
const BOTTOM_OFFSET = 96; // clears the floating tab bar
// The card is anchored bottom-right; translateX runs 0 (right edge) to this
// (left edge), translateY runs 0 down to -MAX_TRANSLATE_Y (near the top).
const LEFT_EDGE_X = -(screenWidth - CARD_WIDTH - EDGE_MARGIN * 2);
const MAX_TRANSLATE_Y = screenHeight - CARD_HEIGHT - BOTTOM_OFFSET - 80;

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

/**
 * Draggable floating card showing the live takeover while the full Video
 * screen is not focused. Tap restores the full screen; X ends the session.
 */
export default function MiniPlayer() {
  const {
    sessionParams,
    phase,
    countdown,
    entries,
    currentIndex,
    downloadProgress,
    player,
    endSession,
    isVideoScreenFocused,
  } = useTakeoverPlayer();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragStart = useSharedValue({ x: 0, y: 0 });

  const restore = useCallback(() => {
    if (navigationRef.isReady() && sessionParams) {
      navigationRef.navigate("Video", sessionParams);
    }
  }, [sessionParams]);

  const pan = Gesture.Pan()
    .onStart(() => {
      dragStart.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      translateX.value = clamp(
        dragStart.value.x + event.translationX,
        LEFT_EDGE_X,
        0
      );
      translateY.value = clamp(
        dragStart.value.y + event.translationY,
        -MAX_TRANSLATE_Y,
        0
      );
    })
    .onEnd(() => {
      // Snap to the nearest horizontal edge
      translateX.value = withSpring(
        translateX.value < LEFT_EDGE_X / 2 ? LEFT_EDGE_X : 0,
        { damping: 20, stiffness: 200 }
      );
    });

  const tap = Gesture.Tap().onEnd((_event, success) => {
    if (success) runOnJS(restore)();
  });

  const gesture = Gesture.Race(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const visible =
    sessionParams !== null &&
    !isVideoScreenFocused &&
    (phase === "resolving" ||
      phase === "downloading" ||
      phase === "countdown" ||
      phase === "playing");
  if (!visible) return null;

  const entry = entries?.[currentIndex];
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
    <Animated.View
      style={[styles.card, animatedStyle]}
      pointerEvents="box-none"
    >
      <GestureDetector gesture={gesture}>
        <Animated.View style={styles.body}>
          {phase === "playing" ? (
            entry?.mediaType === "audio" ? (
              entry.thumbnailURL ? (
                <Image
                  source={{ uri: entry.thumbnailURL }}
                  contentFit="cover"
                  style={styles.fill}
                />
              ) : (
                <View style={styles.centered}>
                  <Music size={36} color={colors.primary} />
                </View>
              )
            ) : (
              <VideoView
                player={player}
                nativeControls={false}
                pointerEvents="none"
                style={styles.fill}
              />
            )
          ) : phase === "countdown" ? (
            <View style={styles.centered}>
              <Text style={styles.countdownText}>
                {countdown !== null && countdown > 0 ? countdown : "…"}
              </Text>
            </View>
          ) : phase === "downloading" ? (
            <View style={styles.centered}>
              <Text style={styles.statusText}>
                Downloading{downloadPercent !== null
                  ? ` ${downloadPercent}%`
                  : "…"}
              </Text>
            </View>
          ) : (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
        </Animated.View>
      </GestureDetector>
      <Pressable
        onPress={endSession}
        hitSlop={10}
        style={styles.closeButton}
        accessibilityLabel="Close video"
      >
        <X size={14} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    card: {
      position: "absolute",
      right: EDGE_MARGIN,
      bottom: BOTTOM_OFFSET,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 14,
      backgroundColor: "#000000",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border ?? "rgba(255,255,255,0.2)",
    },
    body: {
      flex: 1,
      borderRadius: 14,
      overflow: "hidden",
    },
    fill: {
      width: "100%",
      height: "100%",
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    countdownText: {
      fontSize: 32,
      fontWeight: "bold",
      color: "#FFFFFF",
    },
    statusText: {
      fontSize: 13,
      color: "#FFFFFF",
      textAlign: "center",
      paddingHorizontal: 8,
    },
    closeButton: {
      position: "absolute",
      top: -8,
      right: -8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.85)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.4)",
      justifyContent: "center",
      alignItems: "center",
    },
  });
