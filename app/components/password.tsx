import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import COLORS from "./colors";
export default function PasswordInput({ password, setPassword }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.passwordContainer}>
      <TextInput
        secureTextEntry={!showPassword}
        value={password}
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        autoCapitalize="none"
        onChangeText={setPassword}
      />
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => setShowPassword((prev) => !prev)}
      >
        {showPassword ? (
          <Ionicons name="eye-off-outline" size={24} color={COLORS.primary} />
        ) : (
          <Ionicons name="eye-outline" size={24} color={COLORS.primary} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: "#000",
    minHeight: 48,
  },
  iconContainer: {
    padding: 12,
    borderLeftWidth:1
  },
});
