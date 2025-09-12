import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import * as Linking from "expo-linking";
// Screens
import Home from "./app/screens/home";
import Login from "./app/screens/Login";
import { Platform, StatusBar, Vibration } from "react-native";

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { AlertProvider } from "./contexts/dropdownContext";
import { AuthProvider } from "./contexts/authContext";
import LoadingScreen from "./app/screens/loading";
import Signup from "./app/screens/sigup";
import { UserProfileScreen } from "./app/screens/profile";
import VideoScreen from "./app/screens/Video";
import { timeSync } from "./services/timeSync";
import PrivacyPolicyScreen from "./app/screens/policy";

const UNIQUE_VIBRATION_PATTERN = [0, 400, 200, 400, 200, 800];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const Stack = createNativeStackNavigator();

export default function App() {
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
    <AlertProvider>
      <AuthProvider>
        <NavigationContainer
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
              const onReceiveURL = ({ url }: { url: string }) => listener(url);

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
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="Video" component={VideoScreen} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Signup" component={Signup} />
            <Stack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
              options={{ headerShown: true, title: "Privacy Policy" }}
            />
            <Stack.Screen name="Profile" component={UserProfileScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
      <StatusBar barStyle={"dark-content"} backgroundColor={"#fff"} />
    </AlertProvider>
  );
}

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("myNotificationChannel", {
      name: "Custom Notification Channel",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: UNIQUE_VIBRATION_PATTERN,
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) {
        throw new Error("Project ID not found");
      }
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(token);
    } catch (e) {
      token = `${e}`;
    }
  } else {
    alert("Must use physical device for Push Notifications");
  }

  return token;
}
