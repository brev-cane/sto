import BackButton from "@/components/ui/backbutton";
import { useAuth } from "@/contexts/authContext";
import { FIREBASE_AUTH, FIREBASE_STORAGE } from "@/FirebaseConfig";
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
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useAppNavigation } from "@/types/navigation";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { deleteUser } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  AtSign,
  Bell,
  BellRing,
  Camera,
  CheckCircle,
  Copy,
  LucideIcon,
  Mail,
  MapPin,
  RefreshCw,
  Save,
  Shield,
  Trash2,
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
import Toast from "react-native-toast-message";

/** iOS Settings-style icon tile colors (white glyph on colored tile) */
const iconTints = {
  blue: "#007AFF",
  indigo: "#5856D6",
  gray: "#8E8E93",
  red: "#FF3B30",
  orange: "#FF9500",
  green: "#34C759",
  teal: "#5AC8FA",
  purple: "#AF52DE",
};

interface SettingsRowProps {
  icon: LucideIcon;
  iconTint: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
  destructive?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon: Icon,
  iconTint,
  title,
  description,
  right,
  onPress,
  isLast,
  destructive,
}) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={[styles.row, isLast && styles.rowLast]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={[styles.rowIconTile, { backgroundColor: iconTint }]}>
        <Icon size={17} color="#FFFFFF" strokeWidth={2.2} />
      </View>
      <View style={styles.rowBody}>
        <Text
          style={[styles.rowTitle, destructive && styles.rowTitleDestructive]}
        >
          {title}
        </Text>
        {description ? (
          <Text style={styles.rowDescription} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.rowRight}>{right}</View> : null}
    </TouchableOpacity>
  );
};

export const UserProfileScreen: React.FC = () => {
  const {
    userDoc,
    loading,
    firebaseUser,
    setUserDoc,
    pushTokenSynced,
    syncPushTokenWithBackend,
  } = useAuth();
  const [name, setName] = useState(userDoc?.name || "");
  const [username, setUsername] = useState(userDoc?.username || "");
  const [pushEnabled, setPushEnabled] = useState(
    userDoc?.pushToken ? true : false,
  );
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { navigate } = useAppNavigation();
  const [receiveAll, setReceiveAll] = useState(
    userDoc?.receiveAllNotifications === true,
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
            ],
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

  const handleResync = async () => {
    if (resyncing) return;
    setResyncing(true);
    try {
      await syncPushTokenWithBackend();
    } finally {
      setResyncing(false);
    }
  };

  const handleDeleteAccount = () => {
    if (deleting) return;
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? All your data will be permanently removed. This action cannot be reversed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const user = FIREBASE_AUTH.currentUser;
            if (!user) return;
            setDeleting(true);
            try {
              if (GoogleSignin.getCurrentUser()) {
                GoogleSignin.signOut();
              }
              await dbService.collection("users").delete(user.uid);
              await deleteUser(user);
              navigate("Loading");
            } catch (error: any) {
              console.error("Failed to delete account:", error);
              Alert.alert(
                "Error",
                error?.message ?? "Failed to delete account. Please try again.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handlePickPhoto = async () => {
    if (!firebaseUser || !userDoc || photoUploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    setPhotoUploading(true);
    try {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const storageRef = ref(
        FIREBASE_STORAGE,
        `profilePictures/${firebaseUser.uid}.jpg`,
      );
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      const photoURL = await getDownloadURL(storageRef);
      await dbService
        .collection("users")
        .update(firebaseUser.uid, { photoURL });
      setUserDoc({ ...userDoc, photoURL });
      Toast.show({ type: "success", text1: "Profile picture updated" });
    } catch (error) {
      console.error("Failed to upload profile picture:", error);
      Toast.show({ type: "error", text1: "Failed to update picture" });
    } finally {
      setPhotoUploading(false);
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
    name !== (userDoc.name || "") ||
    username !== (userDoc.username || "") ||
    pushEnabled !== !!userDoc.pushToken;

  const handleSave = async () => {
    if (!firebaseUser || !hasChanges) return;
    setSaving(true);
    try {
      const updatedData: Partial<typeof userDoc> = {
        name: name.trim(),
        username: username.trim().toLowerCase(),
      };

      if (pushEnabled) {
        const token = await registerForPushNotificationsAsync();
        updatedData.pushToken = token ?? "";
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
      setUsername(updatedData.username || "");
      setPushEnabled(!!updatedData.pushToken);

      Toast.show({ type: "success", text1: "Profile updated" });
    } catch (error) {
      console.error(error);
      Toast.show({ type: "error", text1: "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  const initials = (name || userDoc.name || userDoc.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  const switchProps = {
    trackColor: { false: colors.border, true: colors.primary },
    ...(Platform.OS === "android" && {
      thumbColor: colors.onPrimary,
    }),
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackButton title="My Profile" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={handlePickPhoto}
            activeOpacity={0.8}
            disabled={photoUploading}
          >
            {userDoc.photoURL ? (
              <Image
                source={{ uri: userDoc.photoURL }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            {photoUploading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Camera size={14} color={colors.onPrimary} strokeWidth={2.4} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarName}>{userDoc.name || "Your Name"}</Text>
          {userDoc.username ? (
            <Text style={styles.avatarUsername}>@{userDoc.username}</Text>
          ) : null}
        </View>

        {/* Account */}
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={User}
            iconTint={iconTints.blue}
            title="Name"
            right={
              <TextInput
                style={styles.rowInput}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="words"
                returnKeyType="done"
              />
            }
          />
          <SettingsRow
            icon={AtSign}
            iconTint={iconTints.indigo}
            title="Username"
            right={
              <TextInput
                style={styles.rowInput}
                value={username}
                onChangeText={(text) =>
                  setUsername(text.replace(/\s/g, "").toLowerCase())
                }
                placeholder="username"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
            }
          />
          <SettingsRow
            icon={Mail}
            iconTint={iconTints.gray}
            title="Email"
            right={
              <Text style={styles.rowValue} numberOfLines={1}>
                {userDoc.email}
              </Text>
            }
            isLast={userDoc.role !== "admin"}
          />
          {userDoc.role === "admin" && (
            <SettingsRow
              icon={Shield}
              iconTint={iconTints.purple}
              title="Role"
              right={<Text style={styles.rowValue}>Admin</Text>}
              isLast
            />
          )}
        </View>

        {/* Notifications */}
        <Text style={styles.sectionHeader}>Notifications</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={Bell}
            iconTint={iconTints.red}
            title="Push Notifications"
            description="Receive game-day alerts on this device"
            right={
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                {...switchProps}
              />
            }
          />
          <SettingsRow
            icon={BellRing}
            iconTint={iconTints.orange}
            title="Receive All Alerts"
            description="Get every alert even when it's targeted by location"
            right={
              <Switch
                value={receiveAll}
                onValueChange={handleReceiveAllToggle}
                {...switchProps}
              />
            }
            isLast
          />
        </View>

        {/* Privacy */}
        <Text style={styles.sectionHeader}>Privacy</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={MapPin}
            iconTint={iconTints.green}
            title="Location Sharing"
            description="Used to send you alerts targeted near (or away from) the stadium"
            right={
              <Switch
                value={locationEnabled}
                onValueChange={handleLocationToggle}
                disabled={locationBusy}
                {...switchProps}
              />
            }
            isLast
          />
        </View>

        {/* Push token */}
        <Text style={styles.sectionHeader}>Push Token</Text>
        <View style={styles.section}>
          <SettingsRow
            icon={Copy}
            iconTint={iconTints.teal}
            title="Copy Token"
            description={userDoc.pushToken || "No token registered"}
            onPress={() => {
              if (!userDoc.pushToken) return;
              Clipboard.setStringAsync(userDoc.pushToken);
              Toast.show({ type: "success", text1: "Copied to clipboard" });
            }}
          />
          <SettingsRow
            icon={pushTokenSynced ? CheckCircle : RefreshCw}
            iconTint={pushTokenSynced ? iconTints.green : iconTints.gray}
            title="Backend Sync"
            description={
              resyncing
                ? "Syncing..."
                : pushTokenSynced
                  ? "Synced with backend"
                  : "Not synced with backend"
            }
            right={
              resyncing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <TouchableOpacity
                  style={styles.syncButton}
                  onPress={handleResync}
                >
                  <RefreshCw
                    size={14}
                    color={colors.success}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.syncButtonText}>Resync</Text>
                </TouchableOpacity>
              )
            }
            isLast
          />
        </View>

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

        {/* Danger zone */}
        <Text style={[styles.sectionHeader, styles.dangerHeader]}>
          Danger Zone
        </Text>
        <View style={[styles.section, styles.dangerSection]}>
          <SettingsRow
            icon={Trash2}
            iconTint={iconTints.red}
            title="Delete Account"
            description="Permanently remove your account and all data"
            destructive
            onPress={handleDeleteAccount}
            right={
              deleting ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : undefined
            }
            isLast
          />
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
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
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
      marginBottom: 16,
      color: colors.text,
    },
    avatarSection: {
      alignItems: "center",
      marginBottom: 24,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.surfaceVariant,
    },
    avatarFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryMuted,
    },
    avatarInitials: {
      ...typography.h1,
      color: colors.primary,
    },
    avatarOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 48,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center",
      justifyContent: "center",
    },
    cameraBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.background,
    },
    avatarName: {
      ...typography.title,
      color: colors.text,
      marginTop: 12,
    },
    avatarUsername: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginTop: 2,
    },
    sectionHeader: {
      ...typography.caption,
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
      marginLeft: 16,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginBottom: 22,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 48,
      paddingLeft: 14,
      paddingRight: 12,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowIconTile: {
      width: 30,
      height: 30,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    rowBody: {
      flex: 1,
      justifyContent: "center",
      paddingRight: 8,
    },
    rowTitle: {
      ...typography.body,
      color: colors.text,
    },
    rowTitleDestructive: {
      color: colors.error,
    },
    dangerHeader: {
      marginTop: 22,
      color: colors.error,
    },
    dangerSection: {
      borderColor: colors.error,
      marginBottom: 0,
    },
    rowDescription: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 1,
    },
    rowRight: {
      flexShrink: 1,
      maxWidth: "55%",
      alignItems: "flex-end",
      justifyContent: "center",
    },
    rowInput: {
      ...typography.body,
      color: colors.text,
      textAlign: "right",
      minWidth: 140,
      paddingVertical: 4,
    },
    rowValue: {
      ...typography.body,
      color: colors.textMuted,
    },
    syncButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    syncButtonText: {
      ...typography.label,
      color: colors.success,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      marginTop: 4,
    },
    buttonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
  });
