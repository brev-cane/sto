import Entypo from "@expo/vector-icons/Entypo";
import { useNavigation } from "@react-navigation/native";
import { TouchableOpacity } from "react-native";

export default function BackButton({ onPress }: { onPress?: () => void }) {
  const { goBack } = useNavigation();
  return (
    <TouchableOpacity
      style={{ paddingHorizontal: 20, paddingVertical: 10 }}
      onPress={() => (onPress ? onPress() : goBack())}
    >
      <Entypo name="chevron-left" size={24} color="black" />
    </TouchableOpacity>
  );
}
