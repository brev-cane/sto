import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import * as Linking from "expo-linking";
// Screens
import Home from "./app/(tabs)/home";
import Login from "./app/(tabs)/Login";
import Settings from "./app/(tabs)/Settings";
import Video from "./app/(tabs)/Video";

// UI
import { Ionicons } from "@expo/vector-icons";
import { Image, Platform, TouchableOpacity, Vibration } from "react-native";

import COLORS from "./app/components/colors";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { AlertProvider } from "./contexts/dropdownContext";
import { AuthProvider } from "./contexts/authContext";
import LoadingScreen from "./app/screens/loading";
import Signup from "./app/(tabs)/sigup";
import AdminScreen from "./app/(tabs)/Admin";

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
const Tab = createBottomTabNavigator();

const LogoTitle = () => (
  <Image
    source={require("./assets/images/light-logo.png")}
    style={{ width: 120, height: 35, resizeMode: "contain" }}
  />
);

function InsideLayout({ navigation }: any) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.text,
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        ),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home-outline";

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Video") {
            iconName = focused ? "videocam" : "videocam-outline";
          } else if (route.name === "Admin") {
            iconName = focused ? "person-circle" : "person-circle-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: "white",
        tabBarStyle: {
          backgroundColor: COLORS.primary,
          height: 58,
          borderTopWidth: 0,
          borderTopColor: "black",
        },
        tabBarLabelStyle: {
          fontWeight: "600",
          fontSize: 12,
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Video" component={Video} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {});

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
                Inside: {
                  screens: {
                    Video: "Video",
                  },
                },
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
            <Stack.Screen name="Inside" component={InsideLayout} />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Signup" component={Signup} />
            <Stack.Screen name="Admin" component={AdminScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
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
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
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
