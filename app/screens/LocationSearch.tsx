import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  GooglePlacesAutocomplete,
  GooglePlacesAutocompleteRef,
} from "react-native-google-places-autocomplete";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import { deliverPickedLocation } from "@/services/locationPickHandoff";

/**
 * Google Places search presented as a modal screen. Picking a result hands
 * the location back through the locationPickHandoff service and closes the
 * screen. Every color is set explicitly from the theme: the library's own
 * defaults don't follow the system scheme, so unstyled parts go
 * dark/invisible when the device is in dark mode.
 */
export default function LocationSearchScreen() {
  const navigation = useNavigation<any>();
  const placesRef = useRef<GooglePlacesAutocompleteRef>(null);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Focus after the modal present animation settles — focusing during the
  // transition can drop the keyboard on iOS
  useEffect(() => {
    const timer = setTimeout(() => placesRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <GooglePlacesAutocomplete
        ref={placesRef}
        placeholder="Search stadium, address, city…"
        fetchDetails={true}
        keepResultsAfterBlur={true}
        onPress={(data, details) => {
          const location = details?.geometry?.location;
          if (location) {
            deliverPickedLocation({
              latitude: location.lat,
              longitude: location.lng,
              label: data.description,
            });
            navigation.goBack();
          }
        }}
        onFail={(error) => console.error("Places autocomplete error:", error)}
        query={{
          key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
          language: "en",
        }}
        debounce={300}
        minLength={2}
        enablePoweredByContainer={false}
        keyboardShouldPersistTaps="handled"
        // v2.6.x crashes on undefined defaults for these two props
        predefinedPlaces={[]}
        textInputProps={{
          placeholderTextColor: colors.placeholder,
          selectionColor: colors.primary,
        }}
        styles={{
          container: styles.autocompleteContainer,
          textInputContainer: styles.textInputContainer,
          textInput: styles.textInput,
          listView: styles.listView,
          row: styles.row,
          separator: styles.separator,
          description: styles.description,
        }}
      />
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    autocompleteContainer: {
      flex: 1,
    },
    textInputContainer: {
      backgroundColor: colors.background,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: typography.body.fontSize,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    listView: {
      flex: 1,
      backgroundColor: colors.background,
    },
    row: {
      paddingVertical: 14,
      backgroundColor: colors.background,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.separator,
    },
    description: {
      fontSize: typography.body.fontSize,
      color: colors.text,
    },
  });
