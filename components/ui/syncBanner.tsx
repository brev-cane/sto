import { Check, Download } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { videoSync } from "@/services/videoSync";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import { SyncStatus } from "@/types/videos";

/**
 * Slim banner shown while videoSync downloads game-day media in the
 * background, so users on slow connections know content is being prepared
 * before a takeover. Renders nothing when the device is up to date.
 */
function SyncBanner() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [done, setDone] = useState(false);
  const lastStatusRef = useRef<SyncStatus | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = videoSync.subscribeSyncStatus((next) => {
      if (next) {
        lastStatusRef.current = next;
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        setDone(false);
        setStatus(next);
        return;
      }
      const last = lastStatusRef.current;
      lastStatusRef.current = null;
      if (last && last.total > 0 && last.completed >= last.total) {
        // Everything downloaded — show the success state briefly, then hide
        setDone(true);
        hideTimerRef.current = setTimeout(() => {
          hideTimerRef.current = null;
          setStatus(null);
          setDone(false);
        }, 2500);
      } else {
        setStatus(null);
        setDone(false);
      }
    });
    return () => {
      unsubscribe();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!status) return null;

  const fraction =
    status.total > 0 ? Math.min(status.completed / status.total, 1) : 0;

  return (
    <View style={styles.banner}>
      <View style={styles.row}>
        {done ? (
          <Check size={16} color={colors.primary} />
        ) : (
          <Download size={16} color={colors.primary} />
        )}
        <Text style={styles.text} numberOfLines={1}>
          {done
            ? "All game-day media downloaded"
            : `Downloading game-day media… ${Math.min(
                status.completed + 1,
                status.total
              )} of ${status.total}`}
        </Text>
      </View>
      {!done && (
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${fraction * 100}%` }]}
          />
        </View>
      )}
    </View>
  );
}

export default SyncBanner;

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    banner: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      marginHorizontal: 10,
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    text: {
      ...typography.bodySmall,
      color: colors.text,
      flex: 1,
    },
    progressTrack: {
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.border,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
  });
