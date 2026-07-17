import { createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { FIREBASE_AUTH, FIRESTORE_DB } from "../../FirebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import Toast from "react-native-toast-message";
import { useAppNavigation } from "@/types/navigation";
import * as Animatable from "react-native-animatable";
import PasswordInput from "../components/password";
import { registerForPushNotificationsAsync } from "@/utils/notificationHelper";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import { Mail, UserPlus, UserRound } from "lucide-react-native";

const logoImage = require("../../assets/images/blue-logo.png");

const Signup = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { navigate } = useAppNavigation();
  const auth = FIREBASE_AUTH;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const signUp = async () => {
    setLoading(true);
    if (!email || !password || !name) {
      Toast.show({ type: "error", text1: "Error", text2: "Please fill all the fields" });
      setLoading(false);
      return;
    }

    try {
      const response = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (response.user) {
        const token = await registerForPushNotificationsAsync();
        await setDoc(doc(FIRESTORE_DB, "users", response.user.uid), {
          email,
          uid: response.user.uid,
          name,
          pushToken: `${token}`,
        });
        navigate("Loading");
        alert("Check your emails!");
      }
    } catch (error: any) {
      let message = "An unknown error occurred. Please try again.";
      switch (error.code) {
        case "auth/email-already-in-use":
          message = "This email is already in use. Please try logging in.";
          break;
        case "auth/invalid-email":
          message = "The email address is not valid.";
          break;
        case "auth/operation-not-allowed":
          message = "Email/password accounts are not enabled.";
          break;
        case "auth/weak-password":
          message =
            "The password is too weak. It must be at least 8 characters.";
          break;
        case "auth/network-request-failed":
          message =
            "Network error. Please check your connection and try again.";
          break;
        case "auth/internal-error":
          message = "An internal error occurred. Please try again later.";
          break;
        default:
          message = error.message;
          break;
      }
      Toast.show({ type: "error", text1: "Error", text2: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.innerContainer}
      >
        {/* Hero */}
        <Animatable.Image
          animation={"pulse"}
          easing="ease-in-out"
          iterationCount={"infinite"}
          source={logoImage}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join the crowd and never miss a takeover</Text>

        {/* Form */}
        <View style={styles.inputWrapper}>
          <UserRound size={18} color={colors.textMuted} />
          <TextInput
            value={name}
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="words"
            onChangeText={setName}
          />
        </View>
        <View style={styles.inputWrapper}>
          <Mail size={18} color={colors.textMuted} />
          <TextInput
            value={email}
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={setEmail}
          />
        </View>
        <PasswordInput password={password} setPassword={setPassword} />

        {/* Create account */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={signUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <UserPlus size={18} color={colors.onPrimary} />
          )}
          <Text style={styles.buttonText}>
            {loading ? "Creating account…" : "Create Account"}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            onPress={() => navigate("Login")}
            disabled={loading}
          >
            <Text style={styles.footerLink}> Log In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScrollView>
  );
};

export default Signup;

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 32,
    },
    innerContainer: {
      width: "100%",
      maxWidth: 420,
      alignSelf: "center",
    },
    logo: {
      width: 110,
      height: 105,
      alignSelf: "center",
      marginBottom: 14,
    },
    title: {
      ...typography.h2,
      color: colors.text,
      textAlign: "center",
    },
    subtitle: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 2,
      marginBottom: 28,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      height: 52,
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    input: {
      ...typography.body,
      flex: 1,
      color: colors.text,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 15,
      borderRadius: 12,
      marginTop: 6,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
    footerRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 18,
    },
    footerText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    footerLink: {
      ...typography.bodySmall,
      fontWeight: "600",
      color: colors.primary,
    },
  });
