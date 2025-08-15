import { Button, StyleSheet, Text, View } from "react-native";
import COLORS from "../components/colors";
import { signOut } from "firebase/auth";
import { FIREBASE_AUTH } from "@/FirebaseConfig";
import { useNavigation } from "@react-navigation/native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import BackButton from "@/components/ui/backbutton";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  // const { showAdmin, setShowAdmin } = useAdmin();
  const { navigate } = useNavigation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <BackButton />

      <View style={styles.container}>
        <Text style={styles.title}>⚙️ Settings</Text>
        <Button
          title="Logout"
          onPress={() => {
            const user = GoogleSignin.getCurrentUser();
            if (user) {
              GoogleSignin.signOut();
            }
            signOut(FIREBASE_AUTH).then(() => navigate("Loading"));
          }}
        />
        {/* <Text style={styles.text}>Toggle Admin Page:</Text>
      <Switch
        value={showAdmin}
        onValueChange={setShowAdmin}
        trackColor={{ false: '#767577', true: COLORS.primary }}
        thumbColor={showAdmin ? COLORS.primary : '#f4f3f4'}
      /> */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 10,
  },
});
