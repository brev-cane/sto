import { useEffect } from "react";
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import COLORS from "../../components/colors";
import { registerForPushNotificationsAsync } from "../../components/notifications";
import { usePushNotifications } from "../../components/usePushNotifications";
import { useAuth } from "@/contexts/authContext";

const logoImage = require("../../../assets/images/light-logo.png");

function Home({ navigation }) {
  const { expoPushToken, notification } = usePushNotifications();
  const { userDoc } = useAuth();

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <View style={styles.container}>
      {/* used for testing */}
      <Text style={{ color: "#fff", marginVertical: 6 }}>Welcome {userDoc?.email}</Text>

      <View style={styles.logoContainer}>
        <Image source={logoImage} style={styles.logo} resizeMode="contain" />
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Video")}
      >
        <Text style={styles.buttonText}>Demo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => Linking.openURL("https://stadiumtakeover.com/charity/")}
      >
        <Text style={styles.buttonText}>Donations</Text>
      </TouchableOpacity>
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
    marginBottom: 50,
  },
  logo: {
    width: 400,
    height: 200,
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
