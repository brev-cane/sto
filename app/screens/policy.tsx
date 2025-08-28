// PrivacyPolicyScreen.tsx
import React from "react";
import { StyleSheet, SafeAreaView } from "react-native";
import { WebView } from "react-native-webview";

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <WebView 
        source={{ uri: "https://stadiumtakeover.com/privacy-policy/" }} 
        startInLoadingState 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
