import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import COLORS from "../components/colors";
import { AppUser, useAuth } from "@/contexts/authContext";
import { sendBatchNotifications } from "@/utils/notificationHelper";
import { useNavigation } from "@react-navigation/native";
import AdminScreen from "./Admin";
import { Drawer } from "react-native-drawer-layout";
import { useEffect, useState } from "react";
import Header from "@/components/ui/header";
import CustomDrawer from "@/components/ui/drawer";
import InstructionsCard from "@/components/ui/instructions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { dbService } from "@/services/dbService";
import * as Animatable from "react-native-animatable";
import PushPermissionComponent from "@/components/ui/pushPermission";

const logoImage = require("../../assets/images/blue-logo.png");

function Home() {
  const {
    userDoc,
    firebaseUser, 
    setUserDoc,
  } = useAuth();
  const { navigate } = useNavigation();
  const [open, setOpen] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const getUser = async () => {
    try {
      if(!firebaseUser) return;
      const userData = await dbService
        .collection("users")
        .getById(firebaseUser?.uid);
      setUserDoc(userData as AppUser);
    } catch (error) {
      console.log("error :", error);
    }
  };
  useEffect(() => {
    getUser();
  }, []);
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      try {
        const nextAllowed = await AsyncStorage.getItem(
          "nextAllowedNotificationTime"
        );
        const ts = parseInt(nextAllowed ?? "0", 10); // avoid NaN
        const diff = Math.max(0, ts - Date.now());
        if (mounted) setCooldownRemaining(Math.ceil(diff / 1000));
      } catch {
        if (mounted) setCooldownRemaining(0);
      }
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSend = async () => {
    try {
      const nextAllowedTs = Date.now() + 1000 * 1000; // delay is in seconds
      await AsyncStorage.setItem(
        "nextAllowedNotificationTime",
        String(nextAllowedTs)
      );
      setCooldownRemaining(Math.ceil((nextAllowedTs - Date.now()) / 1000));

      if (!userDoc?.pushToken) {
        alert("Please enable push notifications first");
        navigate("Profile");
        return;
      }
      const tokens = [userDoc.pushToken];
      await sendBatchNotifications(tokens, 30, "1.mp4");
    } catch (err: any) {
      Alert.alert("⚠️ Error", err.message);
    } finally {
    }
  };

  if (!userDoc) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Drawer
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      renderDrawerContent={CustomDrawer}
    >
      <StatusBar barStyle={"dark-content"} backgroundColor={"#fff"} />
      <Header onPress={() => setOpen(true)} />

      {userDoc?.role === "admin" ? (
        <AdminScreen />
      ) : (
        <View style={styles.container}>
          {/* used for testing */}
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <Animatable.Image
                animation={"pulse"}
                easing="ease-in-out"
                iterationCount={"infinite"}
                source={logoImage}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text
              style={{
                color: "#000",
                marginVertical: 6,
                fontSize: 18,
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              Welcome {userDoc?.name}
            </Text>
          </View>

          <InstructionsCard />

          <TouchableOpacity style={styles.button} onPress={handleSend}>
            <Text style={styles.buttonText}>
              {cooldownRemaining > 0
                ? `Try after ${cooldownRemaining} seconds`
                : "Try Here!"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <PushPermissionComponent />
    </Drawer>
  );
}

export default Home;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#111827",
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 10,
  },
  logoContainer: {
    width: "100%",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 120,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    width: "70%",
    alignSelf: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});
