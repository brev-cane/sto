import { useTheme } from "@/theme";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Menu } from "lucide-react-native";
import { Image } from "expo-image";
import { useAuth } from "@/contexts/authContext";
import { useAppNavigation } from "@/types/navigation";
interface IHeader {
  onPress: () => void;
}
export default function Header({ onPress }: IHeader) {
  const { colors } = useTheme();
  const { userDoc } = useAuth();
  const { navigate } = useAppNavigation();
  const initials = (userDoc?.name || userDoc?.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();
  return (
    <SafeAreaView style={{ backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-evenly",
          padding: 10,
          alignItems:'center'
        }}
      >
        <View style={{ width: "33.33%" }}>
          <TouchableOpacity onPress={onPress}>
            <Menu width={30} height={30} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ width: "33.33%", alignItems: "center" }}>
          <Image
            source={require("../../assets/images/blue-icon.png")}
            contentFit="contain"
            style={{ width: 50, height: 50 }}
          />
        </View>
        <View style={{ width: "33.33%", alignItems: "flex-end" }}>
          <TouchableOpacity onPress={() => navigate("Profile")}>
            {userDoc?.photoURL ? (
              <Image
                source={{ uri: userDoc.photoURL }}
                contentFit="cover"
                style={{ width: 36, height: 36, borderRadius: 18 }}
              />
            ) : (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.onPrimary, fontWeight: "600" }}>
                  {initials}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

    </SafeAreaView>
  );
}
