import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  StyleSheet,
  TextInput,
  View,
  TouchableOpacity,
  Text,
  Platform,
  ScrollView,
} from "react-native";
import { FIREBASE_AUTH, FIRESTORE_DB } from "../../FirebaseConfig";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAlert } from "@/contexts/dropdownContext";
import { useNavigation } from "@react-navigation/native";
import * as AppleAuthentication from "expo-apple-authentication";
import PasswordInput from "../components/password";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { dbService } from "@/services/dbService";
import { useAuth } from "@/contexts/authContext";
import * as Animatable from "react-native-animatable";

const logoImage = require("../../assets/images/blue-logo.png");

GoogleSignin.configure({
  webClientId:
    "785465840386-ii4opp1p0932qh9gdv2grnt23ivbaj88.apps.googleusercontent.com",
});

const Login = () => {
  const [email, setEmail] = useState(
    __DEV__ ? "admin@stadiumtakeover.com" : ""
  );
  const [password, setPassword] = useState(__DEV__ ? "admin@123" : "");
  const [loading, setLoading] = useState(false);
  const { setUserDoc } = useAuth();
  const { showAlert } = useAlert();
  const { navigate } = useNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const handeleAppleAuthentication = async () => {
    try {
      setLoading(true);
      const res = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (res.identityToken) {
        const provider = new OAuthProvider("apple.com");
        console.log("user crede :", provider);
        const credential = provider.credential({ idToken: res.identityToken });
        const userCredential = await signInWithCredential(
          FIREBASE_AUTH,
          credential
        );
        console.log("user crede :", userCredential);
        if (userCredential.user.uid) {
          const res1 = await getDoc(
            doc(FIRESTORE_DB, "users", userCredential.user.uid)
          );
          if (res1.exists()) {
            showAlert("success", "Welcome", "Logged in successfully");
            navigate("Loading");
            return;
          }
          const user = userCredential.user;
          const userObject = {
            uid: user.uid,
            email: user.email,
            name: user.email,
            createdAt: serverTimestamp(),
          };

          const res2 = await setDoc(
            doc(FIRESTORE_DB, "users", user.uid),
            userObject
          ).then(() => {
            setLoading(false);
            showAlert("success", "Welcome", "Logged in successfully");
            navigate("Loading");
          });
        }
      }
    } catch (error) {
      showAlert("error", "Error", "Something went wrong!");
      setLoading(false);
      console.log("error", error);
    }
  };
  const loginByGoogle = async () => {
    try {
      setLoading(true);
      const res = await GoogleSignin.signIn();
      if (res.type === "success") {
        const credential = GoogleAuthProvider.credential(res.data.idToken);
        const userCredential = await signInWithCredential(
          FIREBASE_AUTH,
          credential
        );
        if (userCredential.user.uid) {
          const res1 = await getDoc(
            doc(FIRESTORE_DB, "users", userCredential.user.uid)
          );
          if (res1.exists()) {
            console.log("user exists");
            showAlert("success", "Welcome", "Logged in successfully");
            navigate("Loading");
            return;
          }
          console.log("user exists, does not exist");
          const user = userCredential.user;
          const userObject = {
            uid: user.uid,
            email: user.email,
            name: res.data.user.name,
            createdAt: serverTimestamp(),
          };

          const res2 = await setDoc(
            doc(FIRESTORE_DB, "users", user.uid),
            userObject
          ).then(() => {
            setLoading(false);
            showAlert("success", "Welcome", "Logged in successfully");
            navigate("Loading");
          });
          const userData = await dbService
            .collection("users")
            .getById(user.uid);
          setUserDoc(userData);
        }
      } else {
        throw new Error("Failed to login with Google");
      }
    } catch (error) {
      console.log("error google login :", error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    setLoading(true);
    try {
      const response = await signInWithEmailAndPassword(
        FIREBASE_AUTH,
        email,
        password
      );
      console.log(response);
      showAlert("success", "Welcome", "Logged in successfully");
      navigate("Loading");
    } catch (error: any) {
      console.log(error);
      let message = "An unknown error occurred. Please try again.";
      switch (error.code) {
        case "auth/invalid-email":
          message = "The email address is not valid.";
          break;
        case "auth/user-disabled":
          message = "This user account has been disabled.";
          break;
        case "auth/user-not-found":
          message = "No user found with this email.";
          break;
        case "auth/wrong-password":
          message = "Incorrect password. Please try again.";
          break;
        case "auth/too-many-requests":
          message = "Too many failed attempts. Please try again later.";
          break;
        case "auth/network-request-failed":
          message = "Network error. Please check your internet connection.";
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.scroll}>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.innerContainer}
        >
          <Text style={styles.title}>Sign in</Text>
          <TextInput
            value={email}
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            onChangeText={(text) => setEmail(text)}
          ></TextInput>
          <PasswordInput password={password} setPassword={setPassword} />

          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.loader}
            />
          ) : (
            <>
              <TouchableOpacity style={styles.button} onPress={signIn}>
                <Text style={styles.buttonText}>Log in</Text>
              </TouchableOpacity>
              <Text style={styles.subtitleText}> - OR - </Text>

              <TouchableOpacity
                style={[styles.button, styles.googleButton]}
                onPress={loginByGoogle}
              >
                <Ionicons name="logo-google" size={24} color={colors.primary} />
                <Text style={styles.googleButtonText}>
                  {" "}
                  Sign in with Google
                </Text>
              </TouchableOpacity>

              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={handeleAppleAuthentication}
                >
                  <Ionicons
                    name="logo-apple"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.googleButtonText}>
                    {" "}
                    Sign in with Apple
                  </Text>
                </TouchableOpacity>
              )}
              <View
                style={{
                  backgroundColor: "transparent",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <Text style={styles.subtitleText}>Don't have an account? </Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigate("Signup")}
                >
                  <Text style={styles.secondaryButtonText}>Sign Up</Text>
                </TouchableOpacity>
              </View>
              <Text
                onPress={() => navigate("PrivacyPolicy")}
                style={styles.privacyLink}
              >
                Privacy Policy
              </Text>
            </>
          )}
        </KeyboardAvoidingView>
      </View>
    </ScrollView>
  );
};

export default Login;
const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    scroll: {
      backgroundColor: colors.background,
      padding: 10,
      width: "100%",
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
      marginBottom: 12,
    },
    buttonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
    secondaryButton: {
      alignItems: "center",
    },
    secondaryButtonText: {
      ...typography.button,
      color: colors.primary,
      textDecorationLine: "underline",
    },
    subtitleText: {
      ...typography.subtitle,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 12,
    },
    googleButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.primary,
      textAlign: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      paddingVertical: 16,
      borderRadius: 10,
      alignItems: "center",
      marginBottom: 12,
    },
    googleButtonText: {
      ...typography.button,
      textAlign: "center",
      color: colors.primary,
    },
    privacyLink: {
      ...typography.body,
      textAlign: "center",
      color: colors.primary,
      textDecorationLine: "underline",
    },
    loader: {
      marginTop: 20,
    },
  });
