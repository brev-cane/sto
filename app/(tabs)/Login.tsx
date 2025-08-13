import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import React, { useState, useEffect } from "react";
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
import { doc, setDoc } from "firebase/firestore";
import { registerForPushNotificationsAsync } from "../components/notifications";
import { useAlert } from "@/contexts/dropdownContext";
import { useNavigation } from "@react-navigation/native";
import {
  AppleButton,
  appleAuth,
} from "@invertase/react-native-apple-authentication";
import {
  AppleAuthProvider,
  getAuth,
  revokeAccessToken,
  onAuthStateChanged,
  signInWithCredential,
} from "@react-native-firebase/auth";
import PasswordInput from "../components/password";
import COLORS from "../components/colors";

const Login = () => {
  // async function revokeSignInWithAppleToken() {
  //   // Get an authorizationCode from Apple
  //   const { authorizationCode } = await appleAuth.performRequest({
  //     requestedOperation: appleAuth.Operation.REFRESH,
  //   });

  //   // Ensure Apple returned an authorizationCode
  //   if (!authorizationCode) {
  //     throw new Error('Apple Revocation failed - no authorizationCode returned');
  //   }

  //   // Revoke the token
  //   return revokeAccessToken(getAuth(), authorizationCode);
  // }

  async function onAppleButtonPress() {
    // Start the sign-in request
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      // As per the FAQ of react-native-apple-authentication, the name should come first in the following array.
      // See: https://github.com/invertase/react-native-apple-authentication#faqs
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });

    // Ensure Apple returned a user identityToken
    if (!appleAuthRequestResponse.identityToken) {
      throw new Error("Apple Sign-In failed - no identify token returned");
    }

    // Create a Firebase credential from the response
    //console.log(appleAuthRequestResponse.identityToken);
    const { identityToken, nonce } = appleAuthRequestResponse;
    const appleCredential = AppleAuthProvider.credential(identityToken, nonce);

    // Sign the user in with the credential
    const response = await signInWithCredential(getAuth(), appleCredential);
  }

  const [email, setEmail] = useState(
    __DEV__ ? "admin@stadiumtakeover.com" : ""
  );
  const [password, setPassword] = useState(__DEV__ ? "admin@123" : "");
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();
  const { navigate } = useNavigation();
  const auth = FIREBASE_AUTH;

  const signIn = async () => {
    setLoading(true);
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      console.log(response);
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

  const signUp = async () => {
    setLoading(true);
    try {
      const response = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log(response);
      if (response.user) {
        const token = await registerForPushNotificationsAsync();
        setDoc(doc(FIRESTORE_DB, "users", response.user.uid), {
          email: email,
          uid: response.user.uid,
          pushToken: `${token}`,
        });
        navigate("Loading");
      }
      alert("Check your emails!");
    } catch (error: any) {
      console.log(error);
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.scroll}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.innerContainer}
        >
          <Text style={styles.title}>Sign in</Text>
          <TextInput
            value={email}
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            autoCapitalize="none"
            onChangeText={(text) => setEmail(text)}
          ></TextInput>
          <PasswordInput password={password} setPassword={setPassword} />

          {loading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
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
                onPress={() => navigate("Login")}
              >
                <Ionicons name="logo-google" size={24} color="#007AFF" />
                <Text style={styles.googleButtonText}>
                  {" "}
                  Sign in with Google
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.googleButton}
                onPress={() =>
                  onAppleButtonPress().then(() =>
                    console.log("Apple sign-in complete!")
                  )
                }
              >
                <Ionicons name="logo-apple" size={24} color="#007AFF" />
                <Text style={styles.googleButtonText}> Sign in with Apple</Text>
              </TouchableOpacity>

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
            </>
          )}
        </KeyboardAvoidingView>
      </View>
    </ScrollView>
  );
};

export default Login;
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  scroll: {
    backgroundColor: "#F9FAFB",
    padding: 10,
    width: "100%",
  },
  innerContainer: {
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 24,
    color: "#111827",
    textAlign: "center",
  },
  input: {
    height: 52,
    borderColor: "#D1D5DB",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    fontSize: 16,
    color: "#111827",
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButton: {
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#545f75",
    textAlign: "center",
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#007AFF",
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
    textAlign: "center",
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 16,
  },
  loader: {
    marginTop: 20,
  },
});
