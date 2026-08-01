import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import { useAuth } from "@/contexts/authContext";
import { sendBatchNotifications } from "@/utils/notificationHelper";
import { useAppNavigation } from "@/types/navigation";
import AdminScreen from "./Admin";
import { Drawer } from "react-native-drawer-layout";
import { useEffect, useState } from "react";
import { PlayCircle } from "lucide-react-native";
import Header from "@/components/ui/header";
import CustomDrawer from "@/components/ui/drawer";
import InstructionsCard from "@/components/ui/instructions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Animatable from "react-native-animatable";
import PushPermissionComponent from "@/components/ui/pushPermission";
import LocationPermissionCard from "@/components/ui/locationPermission";
import SyncBanner from "@/components/ui/syncBanner";
import { timeSync } from "@/services/timeSync";

const logoImage = require("../../assets/images/blue-logo.png");

// Matches the lead time real game-day pushes are sent with, so the test
// takeover rehearses the same countdown users see during a game.
const TEST_TAKEOVER_DELAY_SECONDS = 30;
// The local preview skips the push round trip, so there's nothing to wait for
// beyond a countdown short enough to read.
const LOCAL_PREVIEW_DELAY_SECONDS = 5;
const TEST_TAKEOVER_VIDEO = "1.mp4";

function Home() {
  const { userDoc } = useAuth();
  const { navigate } = useAppNavigation();
  const [open, setOpen] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      try {
        const nextAllowed = await AsyncStorage.getItem(
          "nextAllowedNotificationTime",
        );
        const ts = parseInt(nextAllowed ?? "0", 10); // avoid NaN
        const diff = Math.max(0, ts - Date.now());
        if (mounted) setCooldownRemaining(Math.ceil(diff / 1000));
      } catch {
        if (mounted) setCooldownRemaining(0);
      }
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSend = async () => {
    try {
      const pushToken = userDoc?.pushToken;

      // Push is how we reach people whose app is closed, not a precondition
      // for using this one (App Store Guideline 4.5.4). With a real token the
      // test rehearses the full game-day pipeline; without one — notifications
      // declined, or registration failed — the takeover still runs, started
      // locally instead of by a notification tap.
      if (pushToken?.startsWith("ExponentPushToken[")) {
        // Only the push path is throttled; it calls out to the Expo service
        const nextAllowedTs = Date.now() + 1000 * 1000; // delay is in seconds
        await AsyncStorage.setItem(
          "nextAllowedNotificationTime",
          String(nextAllowedTs),
        );
        setCooldownRemaining(Math.ceil((nextAllowedTs - Date.now()) / 1000));

        await sendBatchNotifications(
          [pushToken],
          TEST_TAKEOVER_DELAY_SECONDS,
          TEST_TAKEOVER_VIDEO,
        );
        return;
      }

      navigate("Video", {
        playAt: String(
          timeSync.getSyncedTime() + LOCAL_PREVIEW_DELAY_SECONDS * 1000,
        ),
        videoFile: TEST_TAKEOVER_VIDEO,
      });
    } catch (err: any) {
      Alert.alert("⚠️ Error", err.message);
    }
  };

  if (!userDoc) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Drawer
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      renderDrawerContent={CustomDrawer}
    >
      <Header onPress={() => setOpen(true)} />
      <SyncBanner />

      {userDoc?.role === "admin" ? (
        <AdminScreen />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Animatable.Image
              animation={"pulse"}
              easing="ease-in-out"
              iterationCount={"infinite"}
              source={logoImage}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.welcome}>Welcome, {userDoc?.name}</Text>
            <Text style={styles.welcomeSubtitle}>
              You&apos;re all set for the next takeover
            </Text>
          </View>

          <PushPermissionComponent />
          <InstructionsCard />

          {/* Test takeover */}
          <TouchableOpacity
            style={[
              styles.button,
              cooldownRemaining > 0 && styles.buttonDisabled,
            ]}
            onPress={handleSend}
            disabled={cooldownRemaining > 0}
          >
            <PlayCircle size={18} color={colors.onPrimary} />
            <Text style={styles.buttonText}>
              {cooldownRemaining > 0
                ? `Try again in ${cooldownRemaining}s`
                : "Try It Now"}
            </Text>
          </TouchableOpacity>
          {cooldownRemaining > 0 && (
            <Text style={styles.cooldownHint}>
              A test takeover was just sent to this device
            </Text>
          )}
        </ScrollView>
      )}

      <LocationPermissionCard />
    </Drawer>
  );
}

export default Home;

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
    },
    hero: {
      alignItems: "center",
      paddingTop: 16,
      paddingBottom: 28,
    },
    logo: {
      width: 110,
      height: 110,
      marginBottom: 14,
    },
    welcome: {
      ...typography.h3,
      color: colors.text,
      textAlign: "center",
    },
    welcomeSubtitle: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginTop: 2,
      textAlign: "center",
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 15,
      borderRadius: 12,
      marginTop: 2,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
    cooldownHint: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 8,
    },
  });
