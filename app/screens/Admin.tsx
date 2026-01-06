import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Switch,
  TextInput,
  ScrollView,
} from "react-native";
import * as Sentry from "@sentry/react-native";
import Slider from "@react-native-community/slider";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useAuth } from "@/contexts/authContext";
import COLORS from "../components/colors";
import { User, Video } from "lucide-react-native";
import SearchableDropdown from "@/components/ui/searchableDropDown";
import { httpsCallable } from "firebase/functions";
import { functions, FIREBASE_AUTH } from "@/FirebaseConfig";

const videoOptions = [
  { file: "1.mp4", name: "Hey Ey Ey Ey" },
  { file: "2.mp4", name: "Third Down" },
  { file: "3.mp4", name: "Shout" },
  { file: "4.mp4", name: "Where else" },
  { file: "5.mp4", name: "Mr Brightside" },
  { file: "7.mp4", name: "Be Good Do Good" },
  { file: "10.mp4", name: "Shout Corey" },
  { file: "14.mp4", name: "Shout it Out" },
  { file: "19.mp4", name: "99 Red Balloons" },
  { file: "20.mp4", name: "Give Me a Break" },
];

export default function AdminScreen() {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  // const [video, setVideo] = useState("");
  const [delay, setDelay] = useState(30);
  const [loading, setLoading] = useState(false);
  const [tokensCount, setTokensCount] = useState(0);
  const { userDoc } = useAuth(); // Add 'user' from auth context
  const [isEnabled, setIsEnabled] = useState(__DEV__ ? true : false);
  const [customUsers, setCustomUsers] = useState(false);
  const [customUsersToken, setCustomUsersToken] = useState<string[]>([]);
  const [token, setToken] = useState(""); // This is now a user ID, not a token
  const user = FIREBASE_AUTH.currentUser; // Get current authenticated user
  const [title, setTitle] = useState("Stadium Takeover");
  const toggleSwitch = () => setIsEnabled((previousState) => !previousState);
  const toggleSwitch2 = () => setCustomUsers((previousState) => !previousState);

  const countUsers = async () => {
    try {
      // Check if user is authenticated first
      const currentUser = FIREBASE_AUTH.currentUser;
      if (!currentUser) {
        console.log("User not authenticated yet");
        return;
      }

      console.log("Fetching user count as:", currentUser.uid);

      const getUserCount = httpsCallable(
        functions,
        "getUsersWithPushTokensCount"
      );
      const result = await getUserCount();
      const data = result.data as any;

      if (data.success) {
        setTokensCount(data.count);
        console.log("User count fetched:", data.count);
      }
    } catch (error: any) {
      console.error("Error counting users:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      if (error.code === "functions/unauthenticated") {
        Alert.alert("Authentication Error", "Please log in again");
      } else if (error.code === "functions/permission-denied") {
        Alert.alert("Permission Denied", "Admin access required");
      }
    }
  };

  useEffect(() => {
    // Only fetch count when user is authenticated and loaded
    if (user && userDoc) {
      console.log("User authenticated:", user.uid);
      console.log("User role:", userDoc.role);
      countUsers();
    } else {
      console.log("Waiting for auth...", { user: !!user, userDoc: !!userDoc });
    }
  }, [user, userDoc]); // Add dependencies

  const handleSend = async () => {
    if (selectedVideos.length === 0) {
      Alert.alert("Error", "Please select at least one video");
      return;
    }

    try {
      setLoading(true);

      const sendNotification = httpsCallable(
        functions,
        "sendStadiumTakeoverNotification"
      );
      const params = {
        title: title,
        videoFile: selectedVideos.join(","),
        delaySeconds: delay,
        adminOnly: isEnabled,
        customTokens: customUsers ? customUsersToken : null,
      };

      console.log("Params :", params);
      const result = await sendNotification(params);
      Sentry.captureMessage(JSON.stringify(result.data));
    } catch (err: any) {
      Sentry.captureException(err);
      console.error("Error sending notification:", err);

      // Handle specific Firebase errors
      if (err.code === "functions/unauthenticated") {
        Alert.alert("Error", "You must be logged in to send notifications");
      } else if (err.code === "functions/permission-denied") {
        Alert.alert("Error", "You don't have permission to send notifications");
      } else if (err.code === "functions/resource-exhausted") {
        Alert.alert("Cooldown Active", err.message);
      } else {
        Alert.alert("⚠️ Error", err.message || "Failed to send notifications");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="always"
      contentContainerStyle={{ flex: 1, backgroundColor: "#fff" }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>📢 Stadium Takeover</Text>

        {/* User Count */}
        <View style={styles.infoRow}>
          <View>
            <Text style={styles.infoTitle}>Users</Text>
            <Text style={styles.infoSubtitle}>
              Total users who have enabled {"\n"} push notifications
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <User color={COLORS.primary} />
            <Text style={styles.infoCount}>{tokensCount}</Text>
          </View>
        </View>

        {/* Notification Title */}
        <Text style={styles.label}>Notification Title</Text>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Stadium Takeover"
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Video Picker */}
        <Text style={styles.label}>Select Video(s)</Text>
        <View style={styles.videoPickerContainer}>
          <Video color={COLORS.primary} />
          <SearchableDropdown
            options={videoOptions}
            placeholder={"-- Choose a Video --"}
            onSelect={(item) => {
              setSelectedVideos([...selectedVideos, item.file]);
            }}
          />
        </View>

        {/* Selected Videos List */}
        <View style={styles.userIdList}>
          {selectedVideos.map((v, index) => {
            const videoName =
              videoOptions.find((opt) => opt.file === v)?.name || v;
            return (
              <View key={index} style={styles.userIdChip}>
                <Text style={styles.userIdText}>
                  {index + 1}. {videoName}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedVideos(
                      selectedVideos.filter((_, i) => i !== index)
                    );
                  }}
                >
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}
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

        {/* Admin Only Toggle */}
        <View style={styles.infoRow}>
          <View>
            <Text style={styles.infoTitle}>Admin Only</Text>
            <Text style={styles.infoSubtitle}>
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

        {/* Custom Users Toggle */}
        <View style={styles.infoRow}>
          <View>
            <Text style={styles.infoTitle}>Custom Users only</Text>
            <Text style={styles.infoSubtitle}>
              Send notifications to selected users only
            </Text>
          </View>
          <Switch
            trackColor={{ false: "#767577", true: COLORS.primary }}
            thumbColor={customUsers ? "#FFF" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleSwitch2}
            value={customUsers}
          />
        </View>

        {/* Custom Users Input */}
        {customUsers && (
          <>
            <Text style={styles.title}>{customUsersToken.length} users</Text>
            <View style={styles.inputRow}>
              <TextInput
                placeholder="Enter User ID"
                style={styles.input}
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  if (token.trim()) {
                    setCustomUsersToken([...customUsersToken, token.trim()]);
                    setToken("");
                  }
                }}
              >
                <Text style={{ color: "#fff" }}>Add</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal>
              {customUsersToken.length > 0 && (
                <View style={styles.userIdList}>
                  {customUsersToken.map((userId, index) => (
                    <View key={index} style={styles.userIdChip}>
                      <Text
                        ellipsizeMode="tail"
                        numberOfLines={1}
                        style={[styles.userIdText, { maxWidth: 100 }]}
                      >
                        {userId}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setCustomUsersToken(
                            customUsersToken.filter((_, i) => i !== index)
                          );
                        }}
                      >
                        <Text style={styles.removeButton}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </>
        )}

        {/* Send Button */}
        <View style={{ marginTop: 20 }}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSend}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Sending..." : "Send Notification"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
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
  infoRow: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  infoSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  infoCount: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 5,
  },
  label: {
    fontSize: 16,
    marginTop: 15,
  },
  videoPickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    borderColor: COLORS.primary,
    padding: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  addButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    margin: 5,
    borderRadius: 8,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  userIdList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 10,
  },
  userIdChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  userIdText: {
    color: "#fff",
    fontSize: 14,
    marginRight: 6,
  },
  removeButton: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
