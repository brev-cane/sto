import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PlayCircle, Bell, Users } from "lucide-react-native";
import { Theme, useTheme, useThemedStyles } from "@/theme";

const instructions = [
  {
    id: 1,
    Icon: PlayCircle,
    text: "Use the “Try Here!” button to see how the app works.",
  },
  {
    id: 2,
    Icon: Bell,
    text: "During a game, takeover notifications are automatically sent to all subscribers.",
  },
  {
    id: 3,
    Icon: Users,
    text: "Open the notification to join the cheer before it starts!",
  },
];

const InstructionsCard: React.FC = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Using Stadium Takeover</Text>
      {instructions.map(({ id, Icon, text }) => (
        <View key={id} style={styles.row}>
          <Icon size={22} color={colors.primary} />
          <Text style={styles.text}>{text}</Text>
        </View>
      ))}
    </View>
  );
};

export default InstructionsCard;

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 3,
      marginVertical: 16,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    title: {
      ...typography.title,
      marginBottom: 16,
      color: colors.text,
    },
    row: {
      flexDirection: "row",
      marginBottom: 12,
      alignItems: "center",
    },
    text: {
      ...typography.body,
      flex: 1,
      marginLeft: 10,
      color: colors.textSecondary,
    },
  });
