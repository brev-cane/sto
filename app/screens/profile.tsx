import BackButton from "@/components/ui/backbutton";
import {
  useAuth,
} from "@/contexts/authContext";
import { dbService } from "@/services/dbService";
import {
  clearStoredLocation,
  getLocationPermission,
  isLocationSharingOptedOut,
  requestLocationPermission,
  setLocationSharingOptOut,
  syncLocationToFirestore,
} from "@/services/locationService";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import { registerForPushNotificationsAsync } from "@/utils/notificationHelper";
import * as Clipboard from "expo-clipboard";
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle,
  Copy,
  Mail,
  MapPin,
  RefreshCw,
  Save,
  Shield,
  User,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [receiveAll, setReceiveAll] = useState(
    userDoc?.receiveAllNotifications === true
  );
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    (async () => {
      const permission = await getLocationPermission();
      const optedOut = await isLocationSharingOptedOut();
      setLocationEnabled(permission.granted && !optedOut);
    })();
  }, []);

  const handleLocationToggle = async (value: boolean) => {
    if (!userDoc?.id || locationBusy) return;
    setLocationBusy(true);
    try {
      if (value) {
        await setLocationSharingOptOut(false);
        const permission = await getLocationPermission();
        const granted = permission.granted
          ? true
          : permission.canAskAgain
            ? await requestLocationPermission()
            : false;
        if (granted) {
          await syncLocationToFirestore(userDoc.id, { force: true });
          setLocationEnabled(true);
        } else {
          setLocationEnabled(false);
          Alert.alert(
            "Location Disabled",
            "Location permission is turned off for this app. Enable it in Settings to share your location.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () =>
                  Platform.OS === "ios"
                    ? Linking.openURL("app-settings:")
                    : Linking.openSettings(),
              },
            ]
          );
        }
      } else {
        await setLocationSharingOptOut(true);
        await clearStoredLocation(userDoc.id);
        setLocationEnabled(false);
      }
    } catch (error) {
      console.error("Failed to update location sharing:", error);
    } finally {
      setLocationBusy(false);
    }
  };

  const handleReceiveAllToggle = async (value: boolean) => {
    if (!userDoc?.id) return;
    setReceiveAll(value);
    try {
      await dbService
        .collection("users")
        .update(userDoc.id, { receiveAllNotifications: value });
      setUserDoc({ ...userDoc, receiveAllNotifications: value });
    } catch (error) {
      console.error("Failed to update notification preference:", error);
      setReceiveAll(!value);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!userDoc) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>No user profile found.</Text>
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

      setUserDoc(userData as typeof userDoc);
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
    <SafeAreaView style={styles.safeArea}>
      <BackButton />
      <ScrollView>
        <View style={styles.container}>
          <Text style={styles.title}>My Profile</Text>

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputRow}>
            <Mail size={20} color={colors.primary} style={styles.icon} />
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={userDoc.email}
              editable={false}
            />
          </View>

          {/* Name */}
          <Text style={styles.label}>Name</Text>
          <View style={styles.inputRow}>
            <User size={20} color={colors.primary} style={styles.icon} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={colors.placeholder}
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
              <Bell size={20} color={colors.primary} style={styles.icon} />
              <Text style={styles.rowLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={pushEnabled ? colors.onPrimary : colors.surfaceVariant}
            />
          </View>

          {/* Location Sharing Toggle */}
          <View
            style={[
              styles.inputRow,
              { justifyContent: "space-between", height: 50 },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MapPin size={20} color={colors.primary} style={styles.icon} />
              <Text style={styles.rowLabel}>Location Sharing</Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={handleLocationToggle}
              disabled={locationBusy}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={
                locationEnabled ? colors.onPrimary : colors.surfaceVariant
              }
            />
          </View>
          <Text style={styles.helperText}>
            Used to send you alerts targeted near (or away from) the stadium.
          </Text>

          {/* Receive All Alerts Toggle */}
          <View
            style={[
              styles.inputRow,
              { justifyContent: "space-between", height: 50 },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <BellRing size={20} color={colors.primary} style={styles.icon} />
              <Text style={styles.rowLabel}>Receive All Alerts</Text>
            </View>
            <Switch
              value={receiveAll}
              onValueChange={handleReceiveAllToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={receiveAll ? colors.onPrimary : colors.surfaceVariant}
            />
          </View>
          <Text style={styles.helperText}>
            Get every alert even when it&apos;s targeted by location.
          </Text>
          <Text
            onPress={() => {
              Clipboard.setStringAsync(userDoc.pushToken);
              alert("Copied to clipboard");
            }}
            style={styles.label}
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
            <Copy size={20} color={colors.primary} style={styles.icon} />
            <Text style={styles.input}>{userDoc.pushToken}</Text>
          </TouchableOpacity>
          <View style={styles.syncRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {syncingRef?.current ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : pushTokenSynced ? (
                <CheckCircle
                  size={18}
                  color={colors.success}
                  style={styles.icon}
                />
              ) : (
                <AlertTriangle
                  size={18}
                  color={colors.error}
                  style={styles.icon}
                />
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
              <RefreshCw
                size={16}
                color={colors.success}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.syncButtonText}>Resync</Text>
            </TouchableOpacity>
          </View>
          {/* Role - only visible if admin */}
          {userDoc.role === "admin" && (
            <View style={styles.inputRow}>
              <Shield size={20} color={colors.primary} style={styles.icon} />
              <TextInput
                style={[styles.input, styles.inputDisabled]}
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
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Save
                  size={18}
                  color={colors.onPrimary}
                  style={{ marginRight: 6 }}
                />
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

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      padding: 20,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    loadingText: {
      ...typography.body,
      color: colors.text,
      marginTop: 10,
    },
    title: {
      ...typography.h3,
      textAlign: "center",
      marginBottom: 20,
      color: colors.text,
    },
    label: {
      ...typography.title,
      color: colors.text,
      padding: 4,
    },
    rowLabel: {
      ...typography.body,
      color: colors.text,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    icon: {
      marginRight: 8,
    },
    input: {
      ...typography.body,
      flex: 1,
      paddingVertical: 12,
      color: colors.text,
    },
    inputDisabled: {
      color: colors.textMuted,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 8,
      marginTop: 10,
    },
    buttonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
    message: {
      ...typography.bodySmall,
      textAlign: "center",
      marginTop: 12,
      color: colors.text,
    },
    helperText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginTop: -12,
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    syncRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 10,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
      backgroundColor: colors.surface,
    },
    syncText: {
      ...typography.body,
      color: colors.text,
      marginLeft: 2,
    },
    syncButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    syncButtonText: {
      ...typography.label,
      color: colors.success,
    },
  });
