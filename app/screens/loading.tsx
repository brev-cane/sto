import { useAuth } from "@/contexts/authContext";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native"; 
export default function LoadingScreen() {
  const {firebaseUser}=useAuth()
  const navigation = useNavigation();
  useEffect(() => {
    if (firebaseUser) {
      setTimeout(() => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Inside" }],
          })
        );
      }, 3000);
    } else {
      setTimeout(() => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Login" }],
          })
        );
      }, 3000);
    }
  }, [firebaseUser]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator color={"red"} size={"large"} />
    </View>
  );
}
