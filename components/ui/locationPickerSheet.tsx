import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import {
  GooglePlacesAutocomplete,
  GooglePlacesAutocompleteRef,
} from "react-native-google-places-autocomplete";
import COLORS from "@/app/components/colors";
import { GeoCenter } from "@/types/notifications";

export interface LocationPickerSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface LocationPickerSheetProps {
  onSelect: (center: GeoCenter) => void;
}

/**
 * Google Places search presented as a native bottom sheet (TrueSheet).
 * The sheet owns its native view hierarchy, so the autocomplete's internal
 * FlatList doesn't nest inside the Admin screen's KeyboardAwareScrollView.
 * The input is focused in onDidPresent — autoFocus inside sheets breaks
 * the present animation.
 */
const LocationPickerSheet = forwardRef<
  LocationPickerSheetHandle,
  LocationPickerSheetProps
>(({ onSelect }, ref) => {
  const sheet = useRef<TrueSheet>(null);
  const placesRef = useRef<GooglePlacesAutocompleteRef>(null);

  useImperativeHandle(ref, () => ({
    present: () => {
      sheet.current?.present();
    },
    dismiss: () => {
      sheet.current?.dismiss();
    },
  }));

  return (
    <TrueSheet
      ref={sheet}
      detents={[0.9]}
      cornerRadius={24}
      grabber
      dimmed
      onDidPresent={() => placesRef.current?.focus()}
      header={
        <View style={styles.header}>
          <Text style={styles.title}>Search Location</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => sheet.current?.dismiss()}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.content}>
        <GooglePlacesAutocomplete
          ref={placesRef}
          placeholder="Search stadium, address, city…"
          fetchDetails={true}
          onPress={(data, details) => {
            const location = details?.geometry?.location;
            if (location) {
              onSelect({
                latitude: location.lat,
                longitude: location.lng,
                label: data.description,
              });
              sheet.current?.dismiss();
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
          textInputProps={{}}
          styles={{
            container: styles.autocompleteContainer,
            textInput: styles.textInput,
            row: styles.row,
            description: styles.description,
          }}
        />
      </View>
    </TrueSheet>
  );
});

LocationPickerSheet.displayName = "LocationPickerSheet";

export default LocationPickerSheet;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  autocompleteContainer: {
    flex: 1,
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
  row: {
    paddingVertical: 14,
  },
  description: {
    fontSize: 15,
    color: "#111827",
  },
});
