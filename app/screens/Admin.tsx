import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { Picker } from "@react-native-picker/picker";
import {
  getValidPushTokens,
  sendBatchNotifications,
} from "@/utils/notificationHelper";
import { useAuth } from "@/contexts/authContext";
import COLORS from "../components/colors";
import { Target, User, Video } from "lucide-react-native";
import SearchableDropdown from "@/components/ui/searchableDropDown";

const videoOptions = [
  { file: "1.mp4", name: "Hey Ey Ey Ey" },
  { file: "2.mp4", name: "Third Down" },
  { file: "3.mp4", name: "Shout" },
  { file: "4.mp4", name: "Where else" },
  { file: "5.mp4", name: "Mr Brightened" },
  { file: "6.mp4", name: "We will Rock You" },
  { file: "7.mp4", name: "Be Good Do Good" },
  { file: "8.mp4", name: "Gotta feeling" },
  { file: "9.mp4", name: "Coming in the Air Tonight" },
  //  { file: "10.mp4", name: "" },
  { file: "11.mp4", name: "Dont Need No Education" },
  //  { file: "12.mp4", name: "" },
  { file: "13.mp4", name: "Devil Georgia" },
  { file: "14.mp4", name: "Gonna play Texas" },
  { file: "15.mp4", name: "Rainbow Connection" },
];

export default function AdminScreen() {
  const [video, setVideo] = useState("");
  const [delay, setDelay] = useState(30);
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState([]);
  const { userDoc } = useAuth();
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isEnabled, setIsEnabled] = useState(false);
  const toggleSwitch = () => setIsEnabled((previousState) => !previousState);
  const countUsers = async () => {
    try {
      const tokens = await getValidPushTokens();
      setTokens(tokens);
    } catch (error) {
      console.log("error", error);
    }
  };

  useEffect(() => {
    countUsers();
    let mounted = true;
    const interval = setInterval(async () => {
      try {
        const nextAllowed = await AsyncStorage.getItem(
          "nextAllowedNotificationTimeAdmin"
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
    if (!video) {
      alert("Please select a video");
      return;
    }
    try {
      setLoading(true);

      // set next allowed time locally so the countdown starts right away
      const nextAllowedTs = Date.now() + delay * 1000; // delay is in seconds
      await AsyncStorage.setItem(
        "nextAllowedNotificationTimeAdmin",
        String(nextAllowedTs)
      );
      setCooldownRemaining(Math.ceil((nextAllowedTs - Date.now()) / 1000));
      const tokens = await getValidPushTokens();
      if (tokens.length === 0) {
        console.log("No valid push tokens found.");
        return;
      }
      await sendBatchNotifications(
        isEnabled ? [userDoc?.pushToken as string] : tokens,
        delay,
        video
      );

      Alert.alert("✅ Success", "Notification sent!");
    } catch (err: any) {
      Alert.alert("⚠️ Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📢 Stadium Takeover</Text>
      <View
        style={{
          flexDirection: "row",
          padding: 10,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>Users</Text>
          <Text style={{ fontSize: 14 }}>
            Total users who have enabled {"\n"} push notifications
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <User color={COLORS.primary} />

          <Text style={{ fontSize: 18, fontWeight: "bold" }}>
            {tokens.length}
          </Text>
        </View>
      </View>
      {/* Video Picker */}
      <Text style={styles.label}>Select Video</Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderRadius: 8,
          borderColor: COLORS.primary,
          padding: 10,
        }}
      >
        <Video color={COLORS.primary} />
        <SearchableDropdown
          options={videoOptions}
          placeholder={"-- Choose a Video --"}
          onSelect={(item) => setVideo(item.file)}
        />
      </View>

      {/* Delay Slider */}
      <Text style={styles.label}>Delay: {delay} seconds</Text>
      <Slider
        style={{ width: "100%", height: 40 }}
        minimumValue={10}
        maximumValue={180}
        step={5}
        value={delay}
        onValueChange={setDelay}
        minimumTrackTintColor={COLORS.primary}
        maximumTrackTintColor="#ccc"
        thumbTintColor={COLORS.primary}
      />

      {/* Send Button */}
      <View
        style={{
          flexDirection: "row",
          padding: 10,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>Admin Only</Text>
          <Text style={{ fontSize: 14 }}>
            Send notifications to yourself only
          </Text>
        </View>
        <Switch
          trackColor={{ false: "#767577", true: COLORS.primary }}
          thumbColor={isEnabled ? "#FFF" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleSwitch}
          value={isEnabled}
        />
      </View>

      <View style={{ marginTop: 20 }}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleSend}
          disabled={loading}
        >
          <Text>
            {cooldownRemaining > 0
              ? `Wait ${cooldownRemaining}s`
              : loading
              ? "Sending..."
              : "Send Notification"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",

    marginBottom: 20,
  },
  button: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#007AFF",
    textAlign: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    marginTop: 15,
  },
  pickerContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 5,
  },
  picker: {
    color: "white",
  },
});
