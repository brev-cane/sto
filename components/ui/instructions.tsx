import React, { JSX } from "react";
import { View, Text, StyleSheet } from "react-native";
import { PlayCircle, Bell, Users } from "lucide-react-native";
import COLORS from "@/app/components/colors";

interface Instruction {
  id: number;
  icon: JSX.Element;
  text: string;
}

const instructions: Instruction[] = [
  {
    id: 1,
    icon: <PlayCircle size={22} color={COLORS.primary} />,
    text: "Use the “Try Here!” button to see how the app works.",
  },
  {
    id: 2,
    icon: <Bell size={22} color={COLORS.primary} />,
    text: "During a game, takeover notifications are automatically sent to all subscribers.",
  },
  {
    id: 3,
    icon: <Users size={22} color={COLORS.primary} />,
    text: "Open the notification to join the cheer before it startsfi!",
  },
];

const InstructionsCard: React.FC = () => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Using Stadium Takeover</Text>
      {instructions.map((item) => (
        <View key={item.id} style={styles.row}>
          {item.icon}
          <Text style={styles.text}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
};

export default InstructionsCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "center",
  },
  text: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#374151",
  },
});
