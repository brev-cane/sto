import Entypo from "@expo/vector-icons/Entypo";
import { useNavigation } from "@react-navigation/native";
import { TouchableOpacity, Text } from "react-native";
import { useTheme } from "@/theme";

export default function BackButton({ onPress, title }: { onPress?: () => void; title: string }) {
  const { goBack } = useNavigation();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={{ paddingHorizontal: 20, paddingVertical: 10,flexDirection: "row", alignItems: "center" }}
      onPress={() => (onPress ? onPress() : goBack())}
    >
      <Entypo name="chevron-left" size={24} color={colors.text} />
      <Text style={{ color: colors.text, fontSize: 16, marginLeft: 5 }}>{title}</Text>
    </TouchableOpacity>
  );
}
