import React from "react";
import { View, Text, StyleSheet, Pressable, Share } from "react-native";
import { Image } from "expo-image";
import { Book, ChevronRight, Share as ShareIcon } from "lucide-react-native";
import { useAuth } from "@/contexts/authContext";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import { useAppNavigation } from "@/types/navigation";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { signOut } from "firebase/auth";
import { FIREBASE_AUTH } from "@/FirebaseConfig";
import * as Application from "expo-application";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICON_BADGE_SIZE = 29;

const SettingsRow = ({
  icon,
  iconColor,
  label,
  onPress,
  showChevron = false,
  isLast = false,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  onPress: () => void;
  showChevron?: boolean;
  isLast?: boolean;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <View style={[styles.iconBadge, { backgroundColor: iconColor }]}>
        {icon}
      </View>
      <View style={[styles.rowContent, !isLast && styles.rowSeparator]}>
        <Text style={styles.rowLabel}>{label}</Text>
        {showChevron && (
          <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.5} />
        )}
      </View>
    </Pressable>
  );
};

export default function CustomDrawer() {
  const { userDoc } = useAuth();
  const { navigate } = useAppNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const shareApp = async () => {
    try {
      const message = `🔥🏈🤳🦬Check out *Stadium Takeover*! 🔥🏈🤳🦬
  Make EVERY Bills game a Home Game! 🏟️💥 Shout song, Mr Brightside, Train Horn and more!  Simultaneously played on everyone’s phones throughout all away games!
  *Enable Notifications*
  📱 Download now: https://stadiumtakeover.com/download`;

      await Share.share({
        message,
        title: "Stadium Takeover",
      });
    } catch (error) {
      console.error("Error sharing app:", error);
    }
  };

  const handleSignOut = () => {
    const user = GoogleSignin.getCurrentUser();
    if (user) {
      GoogleSignin.signOut();
    }
    signOut(FIREBASE_AUTH).then(() => navigate("Loading"));
  };

  const initials = userDoc?.name
    ?.split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 50 },
      ]}
    >
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/blue-logo.png")}
          contentFit="contain"
          style={styles.logo}
        />
      </View>

      {userDoc && (
        <Pressable
          style={({ pressed }) => [
            styles.card,
            styles.profileCard,
            pressed && styles.rowPressed,
          ]}
          onPress={() => navigate("Profile")}
        >
          {userDoc.photoURL ? (
            <Image source={{ uri: userDoc.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {userDoc.name}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {userDoc.email}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.5} />
        </Pressable>
      )}

      <View style={styles.card}>
        <SettingsRow
          icon={<Book size={17} color="#FFFFFF" />}
          iconColor={colors.primary}
          label="Privacy Policy"
          onPress={() => navigate("PrivacyPolicy")}
          showChevron
        />
        <SettingsRow
          icon={<ShareIcon size={17} color="#FFFFFF" />}
          iconColor={colors.success}
          label="Share App"
          onPress={shareApp}
          isLast
        />
      </View>

      <View style={styles.card}>
        <Pressable
          style={({ pressed }) => [
            styles.signOutRow,
            pressed && styles.rowPressed,
          ]}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Version {Application.nativeApplicationVersion} (
          {Application.nativeBuildVersion})
        </Text>
        <Text style={styles.footerText}>
          © 2026 STADIUM TAKEOVER. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

const makeStyles = ({ isDark, colors, typography }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // iOS grouped-list look: gray page in light mode, near-black in dark
      backgroundColor: isDark ? colors.background : colors.surface,
      paddingHorizontal: 16,
    },
    header: {
      alignItems: "center",
      marginBottom: 8,
    },
    logo: {
      width: 84,
      height: 84,
    },
    card: {
      backgroundColor: isDark ? colors.surface : colors.background,
      borderRadius: 10,
      marginBottom: 20,
      overflow: "hidden",
    },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    avatarFallback: {
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitials: {
      ...typography.subtitle,
      color: colors.onPrimary,
    },
    profileInfo: {
      flex: 1,
      marginLeft: 12,
    },
    profileName: {
      ...typography.subtitle,
      color: colors.text,
    },
    profileEmail: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 16,
    },
    rowPressed: {
      backgroundColor: colors.surfaceVariant,
    },
    iconBadge: {
      width: ICON_BADGE_SIZE,
      height: ICON_BADGE_SIZE,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
    },
    rowContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginLeft: 12,
      paddingRight: 16,
      paddingVertical: 12,
    },
    rowSeparator: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
    },
    rowLabel: {
      ...typography.body,
      color: colors.text,
    },
    signOutRow: {
      alignItems: "center",
      paddingVertical: 12,
    },
    signOutText: {
      ...typography.body,
      color: colors.error,
    },
    footer: {
      marginTop: "auto",
      alignItems: "center",
      gap: 2,
    },
    footerText: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
    },
  });
