import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Theme, useThemedStyles } from "@/theme";
import { useAuth } from "@/contexts/authContext";
import { sendBatchNotifications } from "@/utils/notificationHelper";
import { useAppNavigation } from "@/types/navigation";
import AdminScreen from "./Admin";
import { Drawer } from "react-native-drawer-layout";
import { useEffect, useState } from "react";
import Header from "@/components/ui/header";
import CustomDrawer from "@/components/ui/drawer";
import InstructionsCard from "@/components/ui/instructions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Animatable from "react-native-animatable";
import PushPermissionComponent from "@/components/ui/pushPermission";
import LocationPermissionCard from "@/components/ui/locationPermission";

const logoImage = require("../../assets/images/blue-logo.png");

function Home() {
  const { userDoc } = useAuth();
  const { navigate } = useAppNavigation();
  const [open, setOpen] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const styles = useThemedStyles(makeStyles);
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
      <View style={styles.loadingContainer}>
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
      <Header onPress={() => setOpen(true)} />

      {userDoc?.role === "admin" ? (
        <AdminScreen />
      ) : (
        <ScrollView style={styles.scroll}>
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
              <Text style={styles.welcome}>Welcome {userDoc?.name}</Text>
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
        </ScrollView>
      )}

      <LocationPermissionCard />
      <PushPermissionComponent />
    </Drawer>
  );
}

export default Home;

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 3,
      marginVertical: 16,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    welcome: {
      ...typography.title,
      color: colors.text,
      marginVertical: 6,
      textAlign: "center",
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 10,
      width: "70%",
      alignSelf: "center",
    },
    buttonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
  });
