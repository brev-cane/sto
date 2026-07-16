import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import {
  Chrome as Home,
  User,
  LogOut,
  Delete,
  User2,
  Book,
  Share as ShareIcon,
  DeleteIcon,
} from "lucide-react-native";
import { useAuth } from "@/contexts/authContext";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import { useNavigation } from "@react-navigation/native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { deleteUser, signOut } from "firebase/auth";
import { FIREBASE_AUTH } from "@/FirebaseConfig";
import { dbService } from "@/services/dbService";

const DrawerItem = ({
  icon,
  label,
  onPress,
  isSelected = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  isSelected?: boolean;
}) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={[styles.drawerItem, isSelected && styles.selectedItem]}
      onPress={onPress}
    >
      {icon}
      <Text
        style={[styles.drawerItemText, isSelected && styles.selectedItemText]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default function CustomDrawer() {
  const { userDoc } = useAuth();
  const { navigate } = useNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          colors.primary,
          "rgba(0,0,0,0.2)",
          "rgba(0,0,0,0.2)",
          "rgba(0,0,0,0.2)",
          colors.primary,
        ]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Image
            source={require("../../assets/images/blue-logo.png")}
            contentFit="contain"
            style={{ width: 100, height: 100 }}
          />
          {userDoc && (
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userDoc.name}</Text>
              <Text style={styles.userEmail}>{userDoc.email}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.bottomSection}>
          <DrawerItem
            icon={<User size={20} color={colors.primary} />}
            label={"Profile"}
            onPress={() => navigate("Profile")}
          />
          <DrawerItem
            icon={<Book size={20} color={colors.primary} />}
            label={"Privacy Policy"}
            onPress={() => navigate("PrivacyPolicy")}
          />
          <DrawerItem
            icon={<ShareIcon size={20} color={colors.primary} />}
            label={"Share App"}
            onPress={shareApp}
          />
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              const user = GoogleSignin.getCurrentUser();
              if (user) {
                GoogleSignin.signOut();
              }
              signOut(FIREBASE_AUTH).then(() => navigate("Loading"));
            }}
          >
            <LogOut size={20} color={colors.primary} />
            <Text style={styles.drawerItemText}>
              Logout
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.logoutButton, { borderTopWidth: 1, borderTopColor: colors.border }]}
            onPress={() => {
              Alert.alert(
                "Confirm Deletion",
                "Are you sure you want to delete your account? This action cannot be reversed.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      const user = FIREBASE_AUTH.currentUser;
                      const user2 = GoogleSignin.getCurrentUser();
                      if (user2) {
                        GoogleSignin.signOut();
                      }
                      if (user) {
                        await dbService
                          .collection("users")
                          .delete(user.uid)
                          .then(() => {
                            console.log("delete user from db");
                            deleteUser(user)
                              .then(() => {
                                console.log("delete user from auth");
                                navigate("Loading");
                              })
                              .catch((error) => {
                                Alert.alert("Error", error.message);
                              });
                          })
                          .catch((e) => console.log("error ;", e));
                      }
                    },
                  },
                ]
              );
            }}
          >
            <DeleteIcon size={20} color={colors.error} />
            <Text style={[styles.drawerItemText, { color: colors.error }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: 50,
      paddingBottom: 12,
      paddingHorizontal: 12,
    },
    headerContent: {
      alignItems: "center",
    },
    appName: {
      ...typography.h2,
      color: colors.onPrimary,
      marginBottom: 12,
    },
    userInfo: {
      alignItems: "center",
    },
    userName: {
      ...typography.title,
      color: colors.onPrimary,
    },
    userEmail: {
      ...typography.bodySmall,
      color: colors.onPrimary,
      opacity: 0.8,
    },
    content: {
      flex: 1,
    },
    menuItems: {
      paddingTop: 12,
    },
    drawerItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginHorizontal: 12,
      borderRadius: 12,
    },
    selectedItem: {
      backgroundColor: colors.primaryMuted,
    },
    drawerItemText: {
      ...typography.subtitle,
      color: colors.text,
      marginLeft: 12,
    },
    selectedItemText: {
      color: colors.primary,
    },
    bottomSection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopColor: colors.border,
    },
    languageButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginHorizontal: 12,
      borderRadius: 12,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginHorizontal: 12,
      borderRadius: 12,
      marginVertical: 10,
    },
  });
