import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Theme, useTheme, useThemedStyles } from "@/theme";
export default function PasswordInput({ password, setPassword }) {
  const [showPassword, setShowPassword] = useState(false);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.passwordContainer}>
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
        style={styles.iconContainer}
        onPress={() => setShowPassword((prev) => !prev)}
      >
        {showPassword ? (
          <Ionicons name="eye-off-outline" size={24} color={colors.primary} />
        ) : (
          <Ionicons name="eye-outline" size={24} color={colors.primary} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      marginBottom: 16,
      backgroundColor: colors.inputBackground,
    },
    input: {
      flex: 1,
      paddingVertical: 10,
      color: colors.text,
      minHeight: 48,
    },
    iconContainer: {
      padding: 12,
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
    },
  });
