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
import { PlayCircle, RefreshCw } from "lucide-react-native";
import Header from "@/components/ui/header";
import CustomDrawer from "@/components/ui/drawer";
import InstructionsCard from "@/components/ui/instructions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Animatable from "react-native-animatable";
import PushPermissionComponent from "@/components/ui/pushPermission";
import LocationPermissionCard from "@/components/ui/locationPermission";
import SyncBanner from "@/components/ui/syncBanner";
import { timeSync } from "@/services/timeSync";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { signOut } from "firebase/auth";
import { FIREBASE_AUTH } from "@/FirebaseConfig";

const logoImage = require("../../assets/images/blue-logo.png");

// Matches the lead time real game-day pushes are sent with, so the test
// takeover rehearses the same countdown users see during a game.
const TEST_TAKEOVER_DELAY_SECONDS = 30;
// The local preview skips the push round trip, so there's nothing to wait for
// beyond a countdown short enough to read.
const LOCAL_PREVIEW_DELAY_SECONDS = 5;
const TEST_TAKEOVER_VIDEO = "1.mp4";
// Hard ceiling on the profile spinner. Whatever the context is still doing,
// the user gets an actionable screen instead of an endless indicator.
const PROFILE_LOAD_TIMEOUT_MS = 12000;

function Home() {
  const { userDoc, userDocStatus, refreshUserDoc } = useAuth();
  const { navigate } = useAppNavigation();
  const [open, setOpen] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [profileLoadTimedOut, setProfileLoadTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    if (userDoc) return;

    const timer = setTimeout(
      () => setProfileLoadTimedOut(true),
      PROFILE_LOAD_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [userDoc, userDocStatus]);

  const handleRetryProfile = async () => {
    setRetrying(true);
    setProfileLoadTimedOut(false);
    try {
      await refreshUserDoc();
    } finally {
      setRetrying(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Not every session is a Google one; failing here must not block sign-out.
    }
    await signOut(FIREBASE_AUTH);
    navigate("Loading");
  };

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
    // The profile fetch either failed or has been pending too long. Either way
    // the user gets an explanation and a way to recover — never a bare spinner
    // that can hang forever (App Store Guideline 2.1).
    if (userDocStatus === "error" || profileLoadTimedOut) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorTitle}>Couldn&apos;t load your profile</Text>
          <Text style={styles.errorMessage}>
            Check your internet connection and try again.
          </Text>
          <TouchableOpacity
            style={[styles.button, retrying && styles.buttonDisabled]}
            onPress={handleRetryProfile}
            disabled={retrying}
          >
            {retrying ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <RefreshCw size={18} color={colors.onPrimary} />
            )}
            <Text style={styles.buttonText}>
              {retrying ? "Retrying…" : "Try Again"}
            </Text>
          </TouchableOpacity>
          {/* If the profile is genuinely unrecoverable, signing out is still a
              way forward rather than a dead end. */}
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={handleSignOut}
            disabled={retrying}
          >
            <Text style={styles.secondaryActionText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      );
    }

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
          <LocationPermissionCard />
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
      paddingHorizontal: 32,
    },
    errorTitle: {
      ...typography.h3,
      color: colors.text,
      textAlign: "center",
    },
    errorMessage: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 6,
      marginBottom: 20,
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
      paddingHorizontal: 24,
      borderRadius: 12,
      marginTop: 2,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    secondaryAction: {
      marginTop: 14,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    secondaryActionText: {
      ...typography.bodySmall,
      fontWeight: "600",
      color: colors.textSecondary,
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
