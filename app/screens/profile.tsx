import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Switch,
  ScrollView,
} from "react-native";
import {
  Mail,
  User,
  Shield,
  Bell,
  Save,
  Copy,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react-native";
import {
  registerForPushNotificationsAsync,
  useAuth,
} from "@/contexts/authContext";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "@/components/ui/backbutton";
import { dbService } from "@/services/dbService";
import COLORS from "../components/colors";

export const UserProfileScreen: React.FC = () => {
  const {
    userDoc,
    loading,
    firebaseUser,
    setUserDoc,
    pushTokenSynced,
    syncingRef,
    syncPushTokenWithBackend,
  } = useAuth();
  const [name, setName] = useState(userDoc?.name || "");
  const [pushEnabled, setPushEnabled] = useState(
    userDoc?.pushToken ? true : false
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10 }}>Loading profile...</Text>
      </View>
    );
  }

  if (!userDoc) {
    return (
      <View style={styles.centered}>
        <Text>No user profile found.</Text>
      </View>
    );
  }

  const hasChanges =
    name !== (userDoc?.name || "") || pushEnabled !== !!userDoc?.pushToken;

  const handleSave = async () => {
    if (!firebaseUser || !hasChanges) return;
    setSaving(true);
    setMessage("");
    try {
      let updatedData: Partial<typeof userDoc> = { name };

      if (pushEnabled) {
        const token = await registerForPushNotificationsAsync();
        updatedData.pushToken = token ?? "";
        updatedData = { name, pushToken: token };
      } else {
        updatedData.pushToken = "";
      }

      await dbService.collection("users").update(firebaseUser.uid, updatedData);
      const userData = await dbService
        .collection("users")
        .getById(firebaseUser.uid);

      setUserDoc(userData);
      // Reset state to match saved values
      setName(updatedData.name || "");
      setPushEnabled(!!updatedData.pushToken);

      setMessage("✅ Profile updated successfully");
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to update profile");
    } finally {
      setSaving(false);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <BackButton />
      <ScrollView>
        <View style={styles.container}>
          <Text style={styles.title}>My Profile</Text>

          {/* Email */}
          <Text style={{ padding: 4, fontSize: 18 }}>Email</Text>
          <View style={styles.inputRow}>
            <Mail size={20} color={COLORS.primary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: "#666" }]}
              value={userDoc.email}
              editable={false}
            />
          </View>

          {/* Name */}
          <Text style={{ padding: 4, fontSize: 18 }}>Name</Text>
          <View style={styles.inputRow}>
            <User size={20} color={COLORS.primary} style={styles.icon} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
            />
          </View>

          {/* Push Notifications Toggle */}
          <View
            style={[
              styles.inputRow,
              { justifyContent: "space-between", height: 50 },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Bell size={20} color={COLORS.primary} style={styles.icon} />
              <Text style={{ fontSize: 16, color: "#111827" }}>
                Push Notifications
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: "#d1d5db", true: COLORS.primary }}
              thumbColor={pushEnabled ? "#fff" : "#f9fafb"}
            />
          </View>
          <Text
            onPress={() => {
              Clipboard.setStringAsync(userDoc.pushToken);
              alert("Copied to clipboard");
            }}
            style={{ padding: 4, fontSize: 18 }}
          >
            Click to copy token
          </Text>
          <TouchableOpacity
            onPress={() => {
              Clipboard.setStringAsync(userDoc.pushToken);
              alert("Copied to clipboard");
            }}
            style={styles.inputRow}
          >
            <Copy size={20} color={COLORS.primary} style={styles.icon} />
            <Text style={styles.input}>{userDoc.pushToken}</Text>
          </TouchableOpacity>
          <View style={styles.syncRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {syncingRef?.current ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : pushTokenSynced ? (
                <CheckCircle size={18} color="#16a34a" style={styles.icon} />
              ) : (
                <AlertTriangle size={18} color="#dc2626" style={styles.icon} />
              )}

              <Text style={styles.syncText}>
                {syncingRef?.current
                  ? "Syncing..."
                  : pushTokenSynced
                  ? "Synced with backend"
                  : "Not synced with backend"}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.syncButton, syncingRef?.current && { opacity: 0.6 }]}
              onPress={() => syncPushTokenWithBackend()}
              disabled={!!syncingRef?.current}
            >
              <RefreshCw size={16} color="#064e3b" style={{ marginRight: 8 }} />
              <Text style={styles.syncButtonText}>Resync</Text>
            </TouchableOpacity>
          </View>
          {/* Role - only visible if admin */}
          {userDoc.role === "admin" && (
            <View style={styles.inputRow}>
              <Shield size={20} color={COLORS.primary} style={styles.icon} />
              <TextInput
                style={[styles.input, { color: "#666" }]}
                value="Admin"
                editable={false}
              />
            </View>
          )}

          {/* Save button */}
          <TouchableOpacity
            style={[styles.button, (saving || !hasChanges) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.buttonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
    color: "#111827",
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
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  message: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
    color: "#111827",
  },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  syncText: {
    fontSize: 15,
    color: "#111827",
    marginLeft: 2,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: "#064e3b",
    fontWeight: "600",
  },
});
