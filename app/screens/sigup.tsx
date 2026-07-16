import { createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { FIREBASE_AUTH, FIRESTORE_DB } from "../../FirebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { useAlert } from "@/contexts/dropdownContext";
import { useNavigation } from "@react-navigation/native";
import * as Animatable from "react-native-animatable";
import PasswordInput from "../components/password";
import { registerForPushNotificationsAsync } from "@/utils/notificationHelper";
import { Theme, useTheme, useThemedStyles } from "@/theme";

const logoImage = require("../../assets/images/blue-logo.png");

const Signup = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();
  const { navigate } = useNavigation();
  const auth = FIREBASE_AUTH;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const signUp = async () => {
    setLoading(true);
    if (!email || !password || !name) {
      showAlert("error", "Error", "Please fill all the fields");
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
      showAlert("error", "Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animatable.Image
        animation={"pulse"}
        easing="ease-in-out"
        iterationCount={"infinite"}
        source={logoImage}
        style={{
          width: 120,
          height: 115,
          alignSelf: "center",
          marginBottom: 12,
        }}
        resizeMode="contain"
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.innerContainer}
        >
          <Text style={styles.title}>Create Account</Text>

          <TextInput
            value={name}
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="words"
            onChangeText={setName}
          />
          <TextInput
            value={email}
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={setEmail}
          />
          <PasswordInput password={password} setPassword={setPassword} />

          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.loader}
            />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => navigate("Login")}
              >
                <Text style={styles.secondaryButtonText}>
                  Already have an account? Log In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={signUp}>
                <Text style={styles.buttonText}>Create Account</Text>
              </TouchableOpacity>
            </>
          )}
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
};

export default Signup;

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    innerContainer: {
      width: "100%",
    },
    title: {
      ...typography.h2,
      marginBottom: 24,
      color: colors.text,
      textAlign: "center",
    },
    input: {
      height: 52,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.inputBackground,
      marginBottom: 16,
      fontSize: typography.body.fontSize,
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 12,
    },
    buttonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
    secondaryButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.primary,
    },
    secondaryButtonText: {
      ...typography.button,
      color: colors.primary,
    },
    loader: {
      marginTop: 20,
    },
  });
