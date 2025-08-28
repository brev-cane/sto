import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import {
  Chrome as Home,
  User,
  LogOut,
  Delete,
  User2,
  Book
} from "lucide-react-native";
import { useAuth } from "@/contexts/authContext";
import COLORS from "@/app/components/colors";
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
}) => (
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

export default function CustomDrawer(props: any) {
  const { userDoc } = useAuth();
  const { navigate } = useNavigation();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          COLORS.primary,
          COLORS.background,
          COLORS.background,
          "rgba(0,0,0,0.9)",
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
            icon={<User size={20} color={COLORS.primary} />}
            label={"Profile"}
            onPress={() => navigate("Profile")}
          />
          <DrawerItem
            icon={<Book size={20} color={COLORS.primary} />}
            label={"Privacy Policy"}
            onPress={() => navigate("PrivacyPolicy")}
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
            <LogOut size={20} color={COLORS.error} />
            <Text style={[styles.drawerItemText, { color: COLORS.error }]}>
              Logout
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
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
            <User2 size={20} color={COLORS.error} />
            <Text style={[styles.drawerItemText, { color: COLORS.error }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.background,
    marginBottom: 12,
  },
  userInfo: {
    alignItems: "center",
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.background,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.background,
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
    backgroundColor: COLORS.primary,
  },
  drawerItemText: {
    fontSize: 16,
    color: COLORS.secondary,
    marginLeft: 12,
    fontWeight: "500",
  },
  selectedItemText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  bottomSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopColor: COLORS.primary,
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
    marginVertical:10,
    borderBottomWidth:1
  },
});
