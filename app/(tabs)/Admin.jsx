import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { useNavigation } from "@react-navigation/native";
import COLORS from "../components/colors";
import { useAuth } from "@/contexts/authContext";
import {
  getValidPushTokens,
  sendBatchNotifications,
} from "@/utils/notificationHelper";

function Admin() {
  const { userDoc } = useAuth();
  const navigation = useNavigation();

  // list of allowed admin emails
  const allowedEmails = [
    "brev_horton@outlook.com",
    "chelseaamalach@gmail.com",
    "stadiumtakeover@gmail.com",
    "johnmalach@mail.com",
  ];
  const isAdmin = allowedEmails.includes(userDoc?.email);

  // video selection state
  const [selectedVideo, setSelectedVideo] = useState(null);

  // countdown timer state
  const [delaySeconds, setDelaySeconds] = useState(10);

  // video list
  const videoOptions = [
    { label: "Lets Go Buffalo!", value: "1.mp4" },
    { label: "Mr. Brightside", value: "5.mp4" },
    // { label: "Test", value: "test.mp4" },
  ];

  const delayOptions = [
    { label: "5 seconds", value: 5 },
    { label: "10 seconds", value: 10 },
    { label: "30 seconds", value: 30 },
    { label: "1 minute", value: 60 },
  ];

  // redirect non-admin users to the home page
  useEffect(() => {
    if (!isAdmin) {
      navigation.navigate("Home");
    }
  }, [userDoc]);

  if (!isAdmin) return null;

  const notifyAllUsers = async () => {
    if (!selectedVideo) {
      console.log("Please select a video before sending.");
      return;
    }
    if (!delaySeconds) {
      console.log("Please select a countdown delay.");
      return;
    }
    const tokens = await getValidPushTokens();
    if (tokens.length === 0) {
      console.log("No valid push tokens found.");
      return;
    }
    await sendBatchNotifications(tokens, delaySeconds, selectedVideo);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Video</Text>
      <RNPickerSelect
        onValueChange={(value) => setSelectedVideo(value)}
        items={videoOptions}
        placeholder={{ label: "Choose a video...", value: null }}
        style={{
          inputIOS: styles.picker,
          inputAndroid: styles.picker,
        }}
        value={selectedVideo}
      />

      <Text style={styles.label}>Countdown</Text>
      <RNPickerSelect
        onValueChange={(value) => setDelaySeconds(value)}
        items={delayOptions}
        placeholder={{ label: "Choose delay...", value: null }}
        style={{
          inputIOS: styles.picker,
          inputAndroid: styles.picker,
        }}
        value={delaySeconds}
      />

      <TouchableOpacity style={styles.button} onPress={notifyAllUsers}>
        <Text style={styles.buttonText}>Send Takeover!</Text>
      </TouchableOpacity>
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
    width: "100%",
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: COLORS.primary,
  },
  picker: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    color: COLORS.text,
    paddingRight: 30,
    width: 250,
    marginBottom: 20,
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
