import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PlayCircle, Bell, Users } from "lucide-react-native";
import { Theme, useTheme, useThemedStyles } from "@/theme";

const instructions = [
  {
    id: 1,
    Icon: PlayCircle,
    text: "Use the “Try It Now” button to see how the app works.",
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
    <View>
      <Text style={styles.sectionHeader}>How it works</Text>
      <View style={styles.card}>
        {instructions.map(({ id, Icon, text }, index) => (
          <View
            key={id}
            style={[
              styles.row,
              index === instructions.length - 1 && styles.rowLast,
            ]}
          >
            <View style={styles.iconTile}>
              <Icon size={17} color={colors.primary} />
            </View>
            <Text style={styles.text}>{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default InstructionsCard;

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    sectionHeader: {
      ...typography.caption,
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
      marginLeft: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginBottom: 22,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 14,
      paddingRight: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    iconTile: {
      width: 30,
      height: 30,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryMuted,
      marginRight: 12,
    },
    text: {
      ...typography.bodySmall,
      flex: 1,
      color: colors.textSecondary,
    },
  });
