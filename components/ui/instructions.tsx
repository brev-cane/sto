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
    icon: <PlayCircle size={22} color="#4F46E5" />,
    text: "Use the try button to simulate the flow of the app.",
  },
  {
    id: 2,
    icon: <Bell size={22} color="#4F46E5" />,
    text: "During a live event you will receive a notification.",
  },
  {
    id: 3,
    icon: <Users size={22} color="#4F46E5" />,
    text: "Open the notification to join the crowd before it expires.",
  },
];

const InstructionsCard: React.FC = () => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>How it works?</Text>
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
    borderWidth:1,
    borderColor:COLORS.primary
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
