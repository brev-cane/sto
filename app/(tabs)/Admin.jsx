import { useEffect } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import COLORS from "../components/colors";
import { useAuth } from "@/contexts/authContext";
import {
  getValidPushTokens,
  sendBatchNotifications,
} from "@/utils/notificationHelper";

const logoImage = require("../../assets/images/light-logo.png");

function Admin() {
  const { userDoc } = useAuth();
  const navigation = useNavigation();

  // List of allowed admin emails
  const allowedEmails = ["brev_horton@outlook.com", "chelseaamalach@gmail.com"];
  const isAdmin = allowedEmails.includes(userDoc?.email);

  useEffect(() => {
    if (!isAdmin) {
      // Redirect non-admins to Home
      navigation.navigate("Home");
    }
  }, [userDoc]);

  if (!isAdmin) return null;

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
      <TouchableOpacity
        style={styles.button}
        onPress={() => notifyAllUsers()}
      >
        <Text style={styles.buttonText}>Send Takeover!</Text>
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

export default Admin;

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
