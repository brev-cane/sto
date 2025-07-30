import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Button,
  KeyboardAvoidingView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { FIREBASE_AUTH, FIRESTORE_DB } from "../../FirebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { registerForPushNotificationsAsync } from "../components/notifications";
import { useAlert } from "@/contexts/dropdownContext";
import { useNavigation } from "@react-navigation/native";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();
  const {navigate}=useNavigation()
  const auth = FIREBASE_AUTH;

  const signIn = async () => {
    setLoading(true);
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      console.log(response);
      navigate("Loading")

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
      showAlert("error","Error",message)
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
         navigate("Loading")
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
    <View style={styles.container}>
      <KeyboardAvoidingView behavior="padding">
        <TextInput
          value={email}
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          onChangeText={(text) => setEmail(text)}
        ></TextInput>
        <TextInput
          secureTextEntry={true}
          value={password}
          style={styles.input}
          placeholder="password"
          autoCapitalize="none"
          onChangeText={(text) => setPassword(text)}
        ></TextInput>

        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <>
            <Button title="Login" onPress={() => signIn()} />
            <Button title="Create account" onPress={() => signUp()} />
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

export default Login;
const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    flex: 1,
    justifyContent: "center",
  },
  input: {
    marginVertical: 4,
    height: 50,
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#fff",
  },
});
