import { FIRESTORE_DB } from "@/FirebaseConfig";
import { collection, getDocs } from "firebase/firestore";

const isValidExpoPushToken = (token: string) => {
  return typeof token === "string" && token.startsWith("ExponentPushToken[");
};

export const getValidPushTokens = async () => {
  const usersRef = collection(FIRESTORE_DB, "users");
  const snapshot = await getDocs(usersRef);
  const tokens: string[] = [];

  snapshot.forEach((doc) => {
    const { pushToken } = doc.data();
    if (isValidExpoPushToken(pushToken)) {
      tokens.push(pushToken);
    }
  });

  return tokens;
};

export const sendBatchNotifications = async (
  tokens: string[],
  delaySeconds = 30,
  videoFile: string
) => {
  const BATCH_SIZE = 100;
  const sentAtISO = new Date().toISOString();

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const messages = batch.map((token) => ({
      to: token,
      sound: "default",
      title: "Stadium Takeover",
      body: `A takeover will start in ${delaySeconds} seconds!`,
      data: {
        screen: `stadiumtakeover://Video?sentAt=${encodeURIComponent(
          sentAtISO
        )}&delaySeconds=${delaySeconds}&videoFile=${encodeURIComponent(videoFile)}`,
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
