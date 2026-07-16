import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
// Screens
import { Vibration } from "react-native";
import {
  navigationDarkTheme,
  navigationLightTheme,
  useTheme,
} from "./theme";
import TabNavigator from "./app/navigation/TabNavigator";
import Login from "./app/screens/Login";

import * as Sentry from "@sentry/react-native";
import * as Notifications from "expo-notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import LoadingScreen from "./app/screens/loading";
import PrivacyPolicyScreen from "./app/screens/policy";
import { UserProfileScreen } from "./app/screens/profile";
import Signup from "./app/screens/sigup";
import VideoScreen from "./app/screens/Video";
import ParkingDetail from "./app/screens/ParkingDetail";
import StadiumDetail from "./app/screens/StadiumDetail";
import LocationSearchScreen from "./app/screens/LocationSearch";
import { AuthProvider } from "./contexts/authContext";
import { AlertProvider } from "./contexts/dropdownContext";
import { timeSync } from "./services/timeSync";
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

export default Sentry.wrap(function App() {
  const { isDark } = useTheme();

  useEffect(() => {
    timeSync.initialize();

    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        Vibration.vibrate(UNIQUE_VIBRATION_PATTERN);
      }
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

  return (
    <GestureHandlerRootView>
      <AlertProvider>
        <AuthProvider>
          <NavigationContainer
            theme={isDark ? navigationDarkTheme : navigationLightTheme}
            linking={{
              prefixes: [Linking.createURL("/")],
              config: {
                screens: {
                  Video: "Video",
                },
              },
              async getInitialURL() {
                const url = await Linking.getInitialURL();

                if (url != null) {
                  return url;
                }

                const response =
                  await Notifications.getLastNotificationResponseAsync();
                console.log(
                  "url received 1:",
                  response?.notification.request.content.data.screen
                );
                return response?.notification.request.content.data.screen;
              },
              subscribe(listener) {
                const onReceiveURL = ({ url }: { url: string }) =>
                  listener(url);

                const eventListenerSubscription = Linking.addEventListener(
                  "url",
                  onReceiveURL
                );

                const subscription =
                  Notifications.addNotificationResponseReceivedListener(
                    (response) => {
                      const url =
                        response.notification.request.content.data.screen;
                      console.log("url received 2:", url);
                      listener(url);
                    }
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
        </AuthProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
      </AlertProvider>
    </GestureHandlerRootView>
  );
});


