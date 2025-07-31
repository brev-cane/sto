import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import COLORS from "../../components/colors";
import { useAuth } from "@/contexts/authContext";
import { useState } from "react";
import {
  getValidPushTokens,
  sendBatchNotifications,
} from "@/utils/notificationHelper";

const logoImage = require("../../../assets/images/light-logo.png");

function Home({ navigation }) {
  const { userDoc, pushToken } = useAuth();
  const [tokens, setTokens] = useState([]);

  async function sendTestNotification(expoPushToken, delaySeconds = 30) {
    const sentAtISO = new Date().toISOString(); // Current time in ISO format

    const message = {
      to: expoPushToken,
      sound: "default",
      title: "🎥 New Video Alert",
      body: `A video will start in ${delaySeconds} seconds!`,
      data: {
        screen: `stadiumtakeover://Video?sentAt=${encodeURIComponent(
          sentAtISO
        )}&delaySeconds=${delaySeconds}`,
      },
    };

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const data = await response.json();
      console.log("✅ Push Notification Sent:", data);
    } catch (error) {
      console.error("❌ Error sending push notification:", error);
    }
  }
  const notifyAllUsers = async () => {
    const tokens = await getValidPushTokens();

    if (tokens.length === 0) {
      console.log("No valid push tokens found.");
      return;
    }

    await sendBatchNotifications(tokens, 10);
  };

  return (
    <View style={styles.container}>
      {/* used for testing */}
      {/* <Text style={{ color: "#fff", marginVertical: 6 }}>
        Welcome {userDoc?.email}
      </Text> */}

      <View style={styles.logoContainer}>
        <Image source={logoImage} style={styles.logo} resizeMode="contain" />
      </View>

      <TouchableOpacity
        style={styles.button}
        // onPress={() => {
        //   navigation.navigate("Video", {
        //     sentAt: new Date().toISOString(),
        //     delaySeconds: 10,
        //   });
        // }}
        onPress={() => notifyAllUsers()}
      >
        <Text style={styles.buttonText}>Try Here!</Text>
      </TouchableOpacity>

      {/* <TouchableOpacity
        style={styles.button}
        onPress={() => Linking.openURL("https://stadiumtakeover.com/charity/")}
      >
        <Text style={styles.buttonText}>Donations</Text>
      </TouchableOpacity> */}
    </View>
  );
}

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 80,
  },
  logoContainer: {
    width: "100%",
    alignItems: "center",
  },
  logo: {
    width: "95%",
    height: "70%",
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    width: "55%",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
