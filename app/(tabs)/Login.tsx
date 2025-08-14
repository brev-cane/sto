import {
  createUserWithEmailAndPassword,
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
import { registerForPushNotificationsAsync } from "../components/notifications";
import { useAlert } from "@/contexts/dropdownContext";
import { useNavigation } from "@react-navigation/native";
import * as AppleAuthentication from "expo-apple-authentication";
import PasswordInput from "../components/password";
import COLORS from "../components/colors";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
GoogleSignin.configure({});

const Login = () => {
  const [email, setEmail] = useState(
    __DEV__ ? "admin@stadiumtakeover.com" : ""
  );
  const [password, setPassword] = useState(__DEV__ ? "admin@123" : "");
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();
  const { navigate } = useNavigation();
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
            email: email,
            name: res.fullName?.nickname ? res.fullName?.nickname : res.email,
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
            showAlert("success", "Welcome", "Logged in successfully");
            navigate("Loading");
            return;
          }
          const user = userCredential.user;
          const userObject = {
            uid: user.uid,
            email: email,
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
                onPress={loginByGoogle}
              >
                <Ionicons name="logo-google" size={24} color={COLORS.primary} />
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
                    color={COLORS.primary}
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
    color: COLORS.primary,
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
    borderColor: COLORS.primary,
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
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 16,
  },
  loader: {
    marginTop: 20,
  },
});
