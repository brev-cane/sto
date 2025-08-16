import COLORS from "@/app/components/colors";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Menu } from "lucide-react-native";
import { Image } from "expo-image";
interface IHeader {
  onPress: () => void;
}
export default function Header({ onPress }: IHeader) {
  return (
    <SafeAreaView style={{ backgroundColor: COLORS.background }}>
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
            <Menu width={30} height={30} />
          </TouchableOpacity>
        </View>
        <View style={{ width: "33.33%", alignItems: "center" }}>
          <Image
            source={require("../../assets/images/blue-icon.png")}
            contentFit="contain"
            style={{ width: 50, height: 50 }}
          />
        </View>
        <View style={{ width: "33.33%" }} />
      </View>
      
    </SafeAreaView>
  );
}
