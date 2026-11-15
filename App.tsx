import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
// Screens
import * as Sentry from "@sentry/react-native";
import * as ExpoInAppUpdates from "expo-in-app-updates";
import * as Notifications from "expo-notifications";
import { BackHandler, Platform, Vibration } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import TabNavigator from "./app/navigation/TabNavigator";
import LoadingScreen from "./app/screens/loading";
import LocationSearchScreen from "./app/screens/LocationSearch";
import Login from "./app/screens/Login";
import ParkingDetail from "./app/screens/ParkingDetail";
import PrivacyPolicyScreen from "./app/screens/policy";
import { UserProfileScreen } from "./app/screens/profile";
import Signup from "./app/screens/sigup";
import StadiumDetail from "./app/screens/StadiumDetail";
import VideoScreen from "./app/screens/Video";
import MiniPlayer from "./components/ui/miniPlayer";
import UpdateNow from "./components/ui/UpdateNow";
import { AuthProvider } from "./contexts/authContext";
import { TakeoverPlayerProvider } from "./contexts/takeoverPlayerContext";
import { timeSync } from "./services/timeSync";
import { navigationDarkTheme, navigationLightTheme, useTheme } from "./theme";
import { navigationRef } from "./types/navigation";
import { UNIQUE_VIBRATION_PATTERN } from "./utils/vibrationHelper";

Sentry.init({
  dsn: "https://f8e7eff6921b25c9d37894d22ce60afc@o4510199103815680.ingest.us.sentry.io/4510205304832000",
  sendDefaultPii: true,
  enableNative: true, // enables native crash capture
  enableNativeCrashHandling: true, // uncaught native crashes
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const Stack = createNativeStackNavigator();

/** Deep-link resolution blocks the first render, so it gets a hard ceiling. */
const INITIAL_URL_TIMEOUT_MS = 3000;

function withLaunchTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Push payloads are untyped and arrive from the server, so a malformed `screen`
 * must not take down the launch path.
 */
function screenUrlFrom(
  response: Notifications.NotificationResponse | null,
): string | null {
  const screen = response?.notification.request.content.data?.screen;
  return typeof screen === "string" && screen.length > 0 ? screen : null;
}

export default Sentry.wrap(function App() {
  const { isDark } = useTheme();
  const [showUpdateBlocker, setShowUpdateBlocker] = useState(false);

  useEffect(() => {
    timeSync.initialize();

    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        Vibration.vibrate(UNIQUE_VIBRATION_PATTERN);
      },
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(response);
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  useEffect(() => {
    checkForMandatoryUpdate();
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        return showUpdateBlocker;
      },
    );

    return () => {
      backHandler.remove();
    };
  }, [showUpdateBlocker]);

  const checkForMandatoryUpdate = async () => {
    if (__DEV__ || Platform.OS === "web") return;

    try {
      const result = await ExpoInAppUpdates.checkForUpdate();

      if (result.updateAvailable) {
        try {
          await ExpoInAppUpdates.startUpdate(true);
        } catch (updateErr) {
          console.error("Failed to start update:", updateErr);
          setShowUpdateBlocker(true);
        }
      }
    } catch (checkErr) {
      console.error("Update check failed:", checkErr);
    }
  };

  const retryUpdate = async () => {
    try {
      await ExpoInAppUpdates.startUpdate(true);
    } catch (retryErr) {
      console.error("Retry update failed:", retryErr);
    }
  };

  if (showUpdateBlocker) {
    return (
      <UpdateNow
        retryUpdate={retryUpdate}
        showUpdateBlocker={showUpdateBlocker}
      />
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ?  '#0F1216': "#fff" }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <TakeoverPlayerProvider>
          <NavigationContainer
            ref={navigationRef}
            theme={isDark ? navigationDarkTheme : navigationLightTheme}
            linking={{
              prefixes: [Linking.createURL("/")],
              config: {
                screens: {
                  Video: "Video",
                },
              },
              async getInitialURL() {
                // NavigationContainer renders nothing until this resolves, so
                // a stalled call here is an indefinite blank launch screen.
                // Cap it and fall through to normal routing instead.
                try {
                  const url = await withLaunchTimeout(
                    Linking.getInitialURL(),
                    INITIAL_URL_TIMEOUT_MS,
                  );

                  if (url != null) {
                    return url;
                  }

                  const response = await withLaunchTimeout(
                    Notifications.getLastNotificationResponseAsync(),
                    INITIAL_URL_TIMEOUT_MS,
                  );
                  const screen = screenUrlFrom(response);
                  console.log("url received 1:", screen);

                  if (screen) {
                    // Clear the stored response so a stale notification tap
                    // doesn't redirect every future cold launch.
                    Notifications.clearLastNotificationResponse();
                  }

                  return screen;
                } catch (error) {
                  console.log("getInitialURL failed:", error);
                  return null;
                }
              },
              subscribe(listener) {
                const onReceiveURL = ({ url }: { url: string }) =>
                  listener(url);

                const eventListenerSubscription = Linking.addEventListener(
                  "url",
                  onReceiveURL,
                );

                const subscription =
                  Notifications.addNotificationResponseReceivedListener(
                    (response) => {
                      const url = screenUrlFrom(response);
                      console.log("url received 2:", url);
                      if (url) listener(url);
                    },
                  );

                return () => {
                  eventListenerSubscription.remove();
                  subscription.remove();
                };
              },
            }}
          >
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen
                name="Loading"
                component={LoadingScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen name="Main" component={TabNavigator} />
              <Stack.Screen name="Video" component={VideoScreen} />
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="Signup" component={Signup} />
              <Stack.Screen
                name="PrivacyPolicy"
                component={PrivacyPolicyScreen}
                options={{ headerShown: true, title: "Privacy Policy" }}
              />
              <Stack.Screen name="Profile" component={UserProfileScreen} />
              <Stack.Screen name="ParkingDetail" component={ParkingDetail} />
              <Stack.Screen name="StadiumDetail" component={StadiumDetail} />
              <Stack.Screen
                name="LocationSearch"
                component={LocationSearchScreen}
                options={{
                  headerShown: true,
                  title: "Search Location",
                  presentation: "modal",
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <MiniPlayer />
          </TakeoverPlayerProvider>
        </AuthProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Toast />
      </GestureHandlerRootView>
    </SafeAreaView>
  );
});
