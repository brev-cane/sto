import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged, User } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { FIREBASE_AUTH } from "./FirebaseConfig";
import * as Clipboard from "expo-clipboard";

// Screens
import Home from "./app/(tabs)/home";
import Login from "./app/(tabs)/Login";
import Settings from "./app/(tabs)/Settings";
import Video from "./app/(tabs)/Video";

// UI
import { Ionicons } from "@expo/vector-icons";
import { Image, Platform, TouchableOpacity } from "react-native";

import COLORS from "./app/components/colors";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { AlertProvider } from "./contexts/dropdownContext";
import { AuthProvider } from "./contexts/authContext";

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
        // headerTitle: () => <LogoTitle />,
        // headerTitleContainerStyle: {
        //   left: 0,
        //   paddingLeft: 0,
        //   marginLeft: -20,
        // },
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
      <Tab.Screen
        name="Video"
        component={Video}
        // option used to disable the video tab on the navbar
        // options={{
        //   tabBarButton: () => null
        // }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [expoPushToken, setExpoPushToken] = useState("");
  const [channels, setChannels] = useState<Notifications.NotificationChannel[]>(
    []
  );
  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >(undefined);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (!token) return;
      setExpoPushToken(token);
      Clipboard.setStringAsync(token);
    });

    if (Platform.OS === "android") {
      Notifications.getNotificationChannelsAsync().then((value) =>
        setChannels(value ?? [])
      );
    }
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (authUser) => {
      setUser(authUser);
    });

    return unsubscribe;
  }, []);

  return (
    <AlertProvider>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
              <>
                <Stack.Screen name="Inside" component={InsideLayout} />
                <Stack.Screen name="Settings" component={Settings} />
              </>
            ) : (
              <Stack.Screen name="Login" component={Login} />
            )}
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
      name: "A channel is needed for the permissions prompt to appear",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
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
    // Learn more about projectId:
    // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    // EAS projectId is used here.
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
