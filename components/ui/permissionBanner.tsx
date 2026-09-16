import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Theme, useTheme, useThemedStyles } from "@/theme";

type PermissionBannerProps = {
  Icon: LucideIcon;
  title: string;
  text: string;
  accessibilityLabel: string;
  onPress: () => void;
};

/**
 * Shared row for "this permission is switched off in Settings" notices.
 *
 * These banners are informational by design: they say what the user is
 * missing and link to Settings, but never cover the screen, gate a feature,
 * or offer a way around an OS prompt that hasn't been shown yet. Keeping the
 * treatment in one component keeps that promise — and the look — identical
 * for push and location, and means a future banner inherits both.
 *
 * Callers are responsible for only rendering this once the OS has actually
 * been asked; showing it while a permission is still undetermined would put a
 * second path next to the prompt, which is what Guideline 5.1.1(iv) forbids.
 */
export default function PermissionBanner({
  Icon,
  title,
  text,
  accessibilityLabel,
  onPress,
}: PermissionBannerProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.iconTile}>
        <Icon size={16} color={colors.primary} />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>

      <ChevronRight size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    // No flex here: the banner is sized by its content so it can sit among the
    // home screen's cards without ever eating into them
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      borderRadius: 12,
      marginBottom: 12,
    },
    iconTile: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    copy: {
      flex: 1,
    },
    title: {
      ...typography.body,
      fontWeight: "600",
      color: colors.text,
    },
    text: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginTop: 1,
    },
  });
