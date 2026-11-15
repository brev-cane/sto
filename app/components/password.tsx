import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Eye, EyeOff, Lock } from "lucide-react-native";
import { Theme, useTheme, useThemedStyles } from "@/theme";

interface PasswordInputProps {
  password: string;
  setPassword: (value: string) => void;
}

export default function PasswordInput({
  password,
  setPassword,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.passwordContainer}>
      <Lock size={18} color={colors.textMuted} />
      <TextInput
        secureTextEntry={!showPassword}
        value={password}
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.placeholder}
        autoCapitalize="none"
        onChangeText={setPassword}
      />
      <TouchableOpacity
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={() => setShowPassword((prev) => !prev)}
      >
        {showPassword ? (
          <EyeOff size={20} color={colors.textMuted} />
        ) : (
          <Eye size={20} color={colors.textMuted} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      height: 52,
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    input: {
      ...typography.body,
      flex: 1,
      color: colors.text,
    },
  });
