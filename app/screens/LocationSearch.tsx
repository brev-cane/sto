import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  GooglePlacesAutocomplete,
  GooglePlacesAutocompleteRef,
} from "react-native-google-places-autocomplete";
import COLORS from "@/app/components/colors";
import { deliverPickedLocation } from "@/services/locationPickHandoff";

/**
 * Google Places search presented as a modal screen. Picking a result hands
 * the location back through the locationPickHandoff service and closes the
 * screen. All colors are pinned: the app runs with userInterfaceStyle
 * "automatic", so anything left to system defaults goes dark/invisible when
 * the device is in dark mode.
 */
export default function LocationSearchScreen() {
  const navigation = useNavigation<any>();
  const placesRef = useRef<GooglePlacesAutocompleteRef>(null);

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
          placeholderTextColor: "#9CA3AF",
          selectionColor: COLORS.primary,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  autocompleteContainer: {
    flex: 1,
  },
  textInputContainer: {
    backgroundColor: "#fff",
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },
  listView: {
    flex: 1,
    backgroundColor: "#fff",
  },
  row: {
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB",
  },
  description: {
    fontSize: 15,
    color: "#111827",
  },
});
