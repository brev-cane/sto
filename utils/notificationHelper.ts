import { timeSync } from "@/services/timeSync";
import { Platform } from "react-native";

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { UNIQUE_VIBRATION_PATTERN } from "./vibrationHelper";

export const sendBatchNotifications = async (
  tokens: string[],
  delaySeconds = 30,
  videoFile: string
) => {
  const BATCH_SIZE = 100;

  // Calculate the exact future timestamp when video should start playing
  const now = timeSync.getSyncedTime();
  const playAtTimestamp = now + delaySeconds * 1000;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const messages = batch.map((token) => ({
      to: token,
      sound: "default",
      title: "Stadium Takeover",
      body: `CLICK HERE to join next takeover starting in ${delaySeconds} seconds`,
      data: {
        screen: `stadiumtakeover://Video?playAt=${playAtTimestamp}&videoFile=${encodeURIComponent(
          videoFile
        )}`,
        customVibrate: true,
      },
    }));

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });
      const result = await response.json();
      console.log("Batch sent:", result);
    } catch (err) {
      console.error("Error sending push notifications:", err);
    }
  }
};


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
    // Declining is a supported outcome, not an error. Return no token and let
    // callers carry on without push (App Store Guideline 4.5.4).
    if (finalStatus !== "granted") {
      return undefined;
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
    } catch (e) {
      // Never hand back the error text: it used to be stored verbatim as the
      // user's pushToken, which is truthy and so read as "push is enabled"
      // everywhere downstream.
      console.log("Failed to get Expo push token:", e);
      token = undefined;
    }
  } else {
    alert("Must use physical device for Push Notifications");
  }

  return token;
}
