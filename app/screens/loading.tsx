import { useAuth } from "@/contexts/authContext";
import { useTheme } from "@/theme";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * Last-resort escape hatch. onAuthStateChanged is reliable, but if it never
 * fires the app must still land somewhere the user can act on rather than
 * spinning on the splash indefinitely (App Store Guideline 2.1).
 */
const AUTH_RESOLVE_TIMEOUT_MS = 8000;

export default function LoadingScreen() {
  const { firebaseUser, loading } = useAuth();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) return;

    const timer = setTimeout(() => setTimedOut(true), AUTH_RESOLVE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    // Wait for Firebase to restore any persisted session before routing;
    // deciding off the initial null used to bounce users through Login.
    if (loading && !timedOut) return;

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: firebaseUser ? "Main" : "Login" }],
      }),
    );
  }, [firebaseUser, loading, timedOut, navigation]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator color={colors.primary} size={"large"} />
    </View>
  );
}
