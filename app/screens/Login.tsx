import {
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutAnimation,
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
import Toast from "react-native-toast-message";
import { useAppNavigation } from "@/types/navigation";
import * as AppleAuthentication from "expo-apple-authentication";
import PasswordInput from "../components/password";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { dbService } from "@/services/dbService";
import { useAuth } from "@/contexts/authContext";
import * as Animatable from "react-native-animatable";
import { ChevronDown, ChevronUp, LogIn, Mail } from "lucide-react-native";

const logoImage = require("../../assets/images/blue-logo.png");

GoogleSignin.configure({
  webClientId:
    "785465840386-ii4opp1p0932qh9gdv2grnt23ivbaj88.apps.googleusercontent.com",
});

const Login = () => {
  const [email, setEmail] = useState(
    __DEV__ ? "admin@stadiumtakeover.com" : "",
  );
  const [password, setPassword] = useState(__DEV__ ? "admin@123" : "");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const { setUserDoc } = useAuth();
  const { navigate } = useAppNavigation();
  const { colors, isDark } = useTheme();
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
        const credential = provider.credential({ idToken: res.identityToken });
        const userCredential = await signInWithCredential(
          FIREBASE_AUTH,
          credential,
        );
        if (userCredential.user.uid) {
          const res1 = await getDoc(
            doc(FIRESTORE_DB, "users", userCredential.user.uid),
          );
          if (res1.exists()) {
            Toast.show({
              type: "success",
              text1: "Welcome",
              text2: "Logged in successfully",
            });
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

          await setDoc(doc(FIRESTORE_DB, "users", user.uid), userObject).then(
            () => {
              setLoading(false);
              Toast.show({
                type: "success",
                text1: "Welcome",
                text2: "Logged in successfully",
              });
              navigate("Loading");
            },
          );
        }
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Something went wrong!",
      });
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
          credential,
        );
        if (userCredential.user.uid) {
          const res1 = await getDoc(
            doc(FIRESTORE_DB, "users", userCredential.user.uid),
          );
          if (res1.exists()) {
            console.log("user exists");
            Toast.show({
              type: "success",
              text1: "Welcome",
              text2: "Logged in successfully",
            });
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

          await setDoc(doc(FIRESTORE_DB, "users", user.uid), userObject).then(
            () => {
              setLoading(false);
              Toast.show({
                type: "success",
                text1: "Welcome",
                text2: "Logged in successfully",
              });
              navigate("Loading");
            },
          );
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
        password,
      ); 
      Toast.show({
        type: "success",
        text1: "Welcome",
        text2: "Logged in successfully",
      });
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
      Toast.show({ type: "error", text1: "Error", text2: message });
    } finally {
      setLoading(false);
    }
  };
  const toggleEmailLogin = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        350,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
    setShowEmailLogin((prev) => !prev);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Toast.show({
        type: "error",
        text1: "Enter your email",
        text2: "Type your email above, then tap Forgot password",
      });
      return;
    }
    setResetting(true);
    try {
      await sendPasswordResetEmail(FIREBASE_AUTH, email.trim());
      Toast.show({
        type: "success",
        text1: "Reset email sent",
        text2: "Check your inbox for a link to reset your password",
      });
    } catch (error: any) {
      console.log("error reset password:", error);
      let message = "Couldn't send the reset email. Please try again.";
      switch (error.code) {
        case "auth/invalid-email":
          message = "The email address is not valid.";
          break;
        case "auth/user-not-found":
          message = "No account found with this email.";
          break;
        case "auth/too-many-requests":
          message = "Too many attempts. Please try again later.";
          break;
        case "auth/network-request-failed":
          message = "Network error. Please check your internet connection.";
          break;
      }
      Toast.show({ type: "error", text1: "Error", text2: message });
    } finally {
      setResetting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
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
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to join the takeover</Text>

        {/* Apple */}
        {Platform.OS === "ios" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={
              isDark
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={12}
            style={[styles.appleButton, loading && styles.buttonDisabled]}
            onPress={handeleAppleAuthentication}
          />
        )}

        {/* Google */}
        <TouchableOpacity
          style={[styles.providerButton, loading && styles.buttonDisabled]}
          onPress={loginByGoogle}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={20} color={colors.text} />
          <Text style={styles.providerButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email toggle */}
        <TouchableOpacity
          style={styles.revealRow}
          onPress={toggleEmailLogin}
          disabled={loading}
        >
          <Mail size={18} color={colors.textMuted} />
          <Text style={styles.revealText}>Continue with email</Text>
          {showEmailLogin ? (
            <ChevronUp size={18} color={colors.textMuted} />
          ) : (
            <ChevronDown size={18} color={colors.textMuted} />
          )}
        </TouchableOpacity>

        {showEmailLogin && (
          <Animatable.View
            animation="fadeInDown"
            duration={400}
            easing="ease-out-cubic"
            style={styles.emailSection}
          >
            <View style={styles.inputWrapper}>
              <Mail size={18} color={colors.textMuted} />
              <TextInput
                value={email}
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={(text) => setEmail(text)}
              />
            </View>
            <PasswordInput password={password} setPassword={setPassword} />

            {/* Forgot password */}
            <TouchableOpacity
              style={styles.forgotButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={handleForgotPassword}
              disabled={resetting || loading}
            >
              <Text style={styles.forgotText}>
                {resetting ? "Sending reset email…" : "Forgot password?"}
              </Text>
            </TouchableOpacity>

            {/* Sign in */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={signIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <LogIn size={18} color={colors.onPrimary} />
              )}
              <Text style={styles.buttonText}>
                {loading ? "Signing in…" : "Sign In"}
              </Text>
            </TouchableOpacity>
          </Animatable.View>
        )}

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don&apos;t have an account?</Text>
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            onPress={() => navigate("Signup")}
          >
            <Text style={styles.footerLink}> Sign Up</Text>
          </TouchableOpacity>
        </View>
        <Text
          onPress={() => navigate("PrivacyPolicy")}
          style={styles.privacyLink}
        >
          Privacy Policy
        </Text>
      </KeyboardAvoidingView>
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
    forgotButton: {
      alignSelf: "flex-end",
      marginBottom: 4,
    },
    forgotText: {
      ...typography.label,
      color: colors.primary,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginVertical: 20,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    dividerText: {
      ...typography.caption,
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    appleButton: {
      width: "100%",
      height: 50,
      marginBottom: 10,
    },
    providerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: 14,
      borderRadius: 12,
      marginBottom: 10,
    },
    providerButtonText: {
      ...typography.button,
      color: colors.text,
    },
    revealRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: 14,
      borderRadius: 12,
    },
    revealText: {
      ...typography.button,
      color: colors.text,
    },
    emailSection: {
      marginTop: 14,
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
    privacyLink: {
      ...typography.caption,
      textAlign: "center",
      color: colors.textMuted,
      textDecorationLine: "underline",
      marginTop: 12,
    },
  });
