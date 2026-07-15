import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import {
  CircleOff,
  LocateFixed,
  Search,
  Target,
} from "lucide-react-native";
import COLORS from "@/app/components/colors";
import {
  GEO_RADIUS_MAX_M,
  GEO_RADIUS_MIN_M,
  GEO_RADIUS_STEP_M,
  formatRadius,
  GeoCenter,
  GeoMode,
} from "@/types/notifications";
import {
  getCurrentCoords,
  getLocationPermission,
  requestLocationPermission,
} from "@/services/locationService";
import LocationPickerSheet, {
  LocationPickerSheetHandle,
} from "./locationPickerSheet";

interface GeoTargetingSectionProps {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  mode: GeoMode;
  onModeChange: (mode: GeoMode) => void;
  radiusMeters: number;
  onRadiusChange: (meters: number) => void;
  center: GeoCenter | null;
  onCenterChange: (center: GeoCenter | null) => void;
  estimatedReach?: number | null;
  reachLoading?: boolean;
}

/**
 * Admin-screen controls for geo-targeted sends: enable switch, a clearly
 * distinct WITHIN (green target) / OUTSIDE (red) mode selector, a 100–5000 m
 * radius slider, and the trigger-location picker (current GPS or Places
 * search). Pure controlled component — all state lives in the Admin screen.
 */
export default function GeoTargetingSection({
  enabled,
  onEnabledChange,
  mode,
  onModeChange,
  radiusMeters,
  onRadiusChange,
  center,
  onCenterChange,
  estimatedReach = null,
  reachLoading = false,
}: GeoTargetingSectionProps) {
  const pickerSheet = useRef<LocationPickerSheetHandle>(null);
  const [locating, setLocating] = useState(false);

  const modeColor = mode === "within" ? COLORS.success : COLORS.accent;

  const handleUseMyLocation = async () => {
    setLocating(true);
    try {
      const permission = await getLocationPermission();
      const granted = permission.granted
        ? true
        : await requestLocationPermission();
      if (!granted) {
        Alert.alert(
          "Location Permission Needed",
          "Enable location for this app in Settings to use your current position."
        );
        return;
      }
      const coords = await getCurrentCoords();
      if (!coords) {
        Alert.alert("Error", "Couldn't read your current location. Try again.");
        return;
      }
      onCenterChange({ ...coords, label: "My current location" });
    } finally {
      setLocating(false);
    }
  };

  return (
    <View>
      {/* Enable toggle — same pattern as the Admin Only row */}
      <View style={styles.infoRow}>
        <View>
          <Text style={styles.infoTitle}>Geo-Targeting</Text>
          <Text style={styles.infoSubtitle}>
            Filter recipients by distance{"\n"}from a location
          </Text>
        </View>
        <Switch
          trackColor={{ false: "#767577", true: COLORS.primary }}
          thumbColor={enabled ? "#FFF" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={onEnabledChange}
          value={enabled}
        />
      </View>

      {enabled && (
        <View>
          {/* WITHIN / OUTSIDE segmented control */}
          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[
                styles.segment,
                mode === "within" && {
                  backgroundColor: COLORS.success,
                  borderColor: COLORS.success,
                },
              ]}
              onPress={() => onModeChange("within")}
            >
              <Target
                size={18}
                color={mode === "within" ? "#fff" : "#666"}
              />
              <Text
                style={[
                  styles.segmentText,
                  mode === "within" && styles.segmentTextActive,
                ]}
              >
                WITHIN
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segment,
                mode === "outside" && {
                  backgroundColor: COLORS.accent,
                  borderColor: COLORS.accent,
                },
              ]}
              onPress={() => onModeChange("outside")}
            >
              <CircleOff
                size={18}
                color={mode === "outside" ? "#fff" : "#666"}
              />
              <Text
                style={[
                  styles.segmentText,
                  mode === "outside" && styles.segmentTextActive,
                ]}
              >
                OUTSIDE
              </Text>
            </TouchableOpacity>
          </View>

          {/* Radius slider */}
          <Text style={styles.label}>Radius: {formatRadius(radiusMeters)}</Text>
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={GEO_RADIUS_MIN_M}
            maximumValue={GEO_RADIUS_MAX_M}
            step={GEO_RADIUS_STEP_M}
            value={radiusMeters}
            onValueChange={onRadiusChange}
            minimumTrackTintColor={modeColor}
            maximumTrackTintColor="#ccc"
            thumbTintColor={modeColor}
          />

          {/* Trigger location picker */}
          <Text style={styles.label}>Alert trigger location</Text>
          <View style={styles.locationButtonsRow}>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleUseMyLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <LocateFixed size={18} color={COLORS.primary} />
              )}
              <Text style={styles.locationButtonText}>My location</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => pickerSheet.current?.present()}
            >
              <Search size={18} color={COLORS.primary} />
              <Text style={styles.locationButtonText}>Search location</Text>
            </TouchableOpacity>
          </View>

          {center && (
            <View style={styles.centerChip}>
              <Text style={styles.centerChipText} numberOfLines={1}>
                📍 {center.label || "Selected location"} (
                {center.latitude.toFixed(5)}, {center.longitude.toFixed(5)})
              </Text>
              <TouchableOpacity onPress={() => onCenterChange(null)}>
                <Text style={styles.removeButton}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Summary banner */}
          {center ? (
            <View
              style={[
                styles.summaryBox,
                {
                  backgroundColor:
                    mode === "within" ? "#e8f5e9" : "#fdecea",
                  borderColor: modeColor,
                },
              ]}
            >
              <Text style={styles.summaryText}>
                Will send only to users{" "}
                <Text style={[styles.summaryStrong, { color: modeColor }]}>
                  {mode.toUpperCase()} {formatRadius(radiusMeters)}
                </Text>{" "}
                of {center.label || "the selected location"} — plus everyone
                who opted in to all alerts.
              </Text>
              <Text style={styles.reachText}>
                {reachLoading
                  ? "Estimating reach…"
                  : estimatedReach !== null
                    ? `Estimated reach: ~${estimatedReach} users`
                    : ""}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.summaryBox,
                { backgroundColor: "#fff8e1", borderColor: COLORS.warning },
              ]}
            >
              <Text style={styles.summaryText}>
                ⚠️ Choose a trigger location to enable geo-targeted sending.
              </Text>
            </View>
          )}
        </View>
      )}

      <LocationPickerSheet ref={pickerSheet} onSelect={onCenterChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  infoSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  label: {
    fontSize: 16,
    marginTop: 15,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 5,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  segmentText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#666",
  },
  segmentTextActive: {
    color: "#fff",
  },
  locationButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  locationButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "#fff",
  },
  locationButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  centerChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  centerChipText: {
    color: "#fff",
    fontSize: 14,
    marginRight: 8,
    flexShrink: 1,
  },
  removeButton: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  summaryBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  summaryText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  summaryStrong: {
    fontWeight: "800",
  },
  reachText: {
    fontSize: 13,
    color: "#555",
    marginTop: 6,
    fontWeight: "600",
  },
});
