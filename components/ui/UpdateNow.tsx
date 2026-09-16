import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Theme, useTheme, useThemedStyles } from "@/theme";

export default function UpdateNow({
  retryUpdate,
  showUpdateBlocker,
}: {
  retryUpdate: () => void;
  showUpdateBlocker: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [floatAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (showUpdateBlocker) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -15,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showUpdateBlocker, floatAnim]);

  return (
    <View style={styles.blockingContainer}>
      <View style={styles.blurCircle1} />
      <View style={styles.blurCircle2} />

      <Animated.View
        style={[styles.iconContainer, { transform: [{ translateY: floatAnim }] }]}
      >
        <View style={styles.iconGlow} />
        <MaterialCommunityIcons
          name="rocket-launch"
          size={100}
          color={colors.primary}
        />
      </Animated.View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>New Version Available</Text>
        <Text style={styles.message}>
          {"We've released a critical update with exciting new features and performance improvements."}
          {"\n\n"}Please update to continue using STADIUM TAKEOVER.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={retryUpdate}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Update Now</Text>
        <MaterialCommunityIcons
          name="arrow-right"
          size={20}
          color={colors.onPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    blockingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      backgroundColor: colors.background,
    },
    blurCircle1: {
      position: "absolute",
      top: -50,
      right: -50,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: colors.primaryMuted,
    },
    blurCircle2: {
      position: "absolute",
      bottom: -80,
      left: -80,
      width: 250,
      height: 250,
      borderRadius: 125,
      backgroundColor: colors.primaryMuted,
    },
    iconContainer: {
      marginBottom: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    iconGlow: {
      position: "absolute",
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.primaryMuted,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 30,
      elevation: 20,
    },
    textContainer: {
      alignItems: "center",
      marginBottom: 60,
    },
    title: {
      ...typography.h2,
      color: colors.text,
      textAlign: "center",
      marginBottom: 16,
    },
    message: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: 10,
    },
    button: {
      width: "100%",
      height: 56,
      borderRadius: 12,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.primary,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
    },
    buttonText: {
      ...typography.button,
      color: colors.onPrimary,
      letterSpacing: 0.5,
    },
  });
