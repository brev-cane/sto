import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import COLORS from "../../components/colors";
import { useAuth } from "@/contexts/authContext";
import {
  getValidPushTokens,
  sendBatchNotifications,
} from "@/utils/notificationHelper";
import { useNavigation } from "@react-navigation/native";
import AdminScreen from "../Admin";

const logoImage = require("../../../assets/images/blue-logo.png");

function Home({ navigation }) {
  const { userDoc } = useAuth();
  const { navigate } = useNavigation();
  const notifyAllUsers = async () => {
    const tokens = await getValidPushTokens();

    if (tokens.length === 0) {
      console.log("No valid push tokens found.");
      return;
    }

    await sendBatchNotifications(tokens, 10);
  };
  if (!userDoc) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  console.log("user doc", userDoc);

  return userDoc?.role === "admin" ? (
    <AdminScreen />
  ) : (
    <View style={styles.container}>
      {/* used for testing */}
      <Text style={{ color: "#000", marginVertical: 6 }}>
        Welcome {userDoc?.name}
        {/* Welcome Billy */}
      </Text>

      <View style={styles.logoContainer}>
        <Image source={logoImage} style={styles.logo} resizeMode="contain" />
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          navigation.navigate("Video", {
            sentAt: new Date().toISOString(),
            delaySeconds: 10,
          });
        }}
        // onPress={() => notifyAllUsers()}
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
