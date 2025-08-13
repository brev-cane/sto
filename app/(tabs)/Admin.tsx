import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { Picker } from "@react-native-picker/picker";
import {
  getValidPushTokens,
  sendBatchNotifications,
} from "@/utils/notificationHelper";
import { useAuth } from "@/contexts/authContext";
import COLORS from "../components/colors";

const videoOptions = [
  { file: "1.mp4", name: "Hey Ey Ey Ey" },
  { file: "5.mp4", name: "Mr Brightside" }, 
];

export default function AdminScreen() {
  const [video, setVideo] = useState("");
  const [delay, setDelay] = useState(30);
  const [loading, setLoading] = useState(false);
  const { userDoc } = useAuth();
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
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
    if (!video) {
      alert("Please select a video");
      return;
    }
    try {
      setLoading(true);

      // set next allowed time locally so the countdown starts right away
      const nextAllowedTs = Date.now() + delay * 1000; // delay is in seconds
      await AsyncStorage.setItem(
        "nextAllowedNotificationTime",
        String(nextAllowedTs)
      );
      setCooldownRemaining(Math.ceil((nextAllowedTs - Date.now()) / 1000));
      const tokens = await getValidPushTokens();
      if (tokens.length === 0) {
        console.log("No valid push tokens found.");
        return;
      }
      await sendBatchNotifications(
        [userDoc?.pushToken as string],
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

      {/* Video Picker */}
      <Text style={styles.label}>Select Video</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={video}
          onValueChange={(itemValue) => setVideo(itemValue)}
          style={styles.picker}
          dropdownIconColor={"#fff"}
        >
          <Picker.Item label="-- Choose a Video --" value="" />
          {videoOptions.map((v) => (
            <Picker.Item key={v.file} label={v.name} value={v.file} />
          ))}
        </Picker>
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
        minimumTrackTintColor="#1e90ff"
        maximumTrackTintColor="#ccc"
        thumbTintColor="#1e90ff"
      />

      {/* Send Button */}
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
