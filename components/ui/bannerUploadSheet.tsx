import { TrueSheet } from "@lodev09/react-native-true-sheet";
import * as ImagePicker from "expo-image-picker";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable } from "firebase/storage";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { FIREBASE_STORAGE, FIRESTORE_DB } from "@/FirebaseConfig";
import { Theme, useTheme, useThemedStyles } from "@/theme";

type Stage = "idle" | "uploading" | "processing" | "ready" | "failed";

export type BannerVideoOption = {
  /** Catalog videos/{id} doc id */
  file: string;
  name: string;
};

interface Props {
  /** Ready+active videos the banner can be attached to */
  videoOptions: BannerVideoOption[];
  /** Called when a new banner reaches "ready" */
  onUploaded?: () => void;
}

const BannerUploadSheet = forwardRef<TrueSheet, Props>(
  ({ videoOptions, onUploaded }, ref) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(makeStyles);

    const [name, setName] = useState("");
    const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(
      null
    );
    const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
    const [stage, setStage] = useState<Stage>("idle");
    const [uploadPercent, setUploadPercent] = useState(0);
    const [failureMessage, setFailureMessage] = useState<string | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    useEffect(() => () => unsubscribeRef.current?.(), []);

    const reset = useCallback(() => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      setName("");
      setImage(null);
      setSelectedVideoIds([]);
      setStage("idle");
      setUploadPercent(0);
      setFailureMessage(null);
    }, []);

    const pickImage = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
      });
      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0]);
      }
    };

    const toggleVideo = (id: string) => {
      setSelectedVideoIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    };

    const startUpload = async () => {
      if (!name.trim()) {
        Toast.show({ type: "error", text1: "Enter a name" });
        return;
      }
      if (!image) {
        Toast.show({ type: "error", text1: "Pick a banner image first" });
        return;
      }

      try {
        setStage("uploading");
        setUploadPercent(0);
        setFailureMessage(null);

        const bannerId = doc(collection(FIRESTORE_DB, "banners")).id;
        const docRef = doc(FIRESTORE_DB, "banners", bannerId);
        await setDoc(docRef, {
          name: name.trim(),
          status: "processing",
          active: true,
          videoIds: selectedVideoIds,
          order: 0,
          version: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const blob = await (await fetch(image.uri)).blob();
        const task = uploadBytesResumable(
          storageRef(
            FIREBASE_STORAGE,
            `uploads/banners/${bannerId}/original.jpg`
          ),
          blob,
          {
            contentType: image.mimeType ?? "image/jpeg",
            customMetadata: { name: name.trim() },
          }
        );

        task.on(
          "state_changed",
          (snapshot) => {
            setUploadPercent(
              Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              )
            );
          },
          (error) => {
            console.error("Banner upload failed:", error);
            setStage("failed");
            setFailureMessage(error.message);
          },
          () => {
            // Upload done — processBanner takes over. Watch the doc so the
            // admin sees processing flip to ready/failed live.
            setStage("processing");
            unsubscribeRef.current = onSnapshot(docRef, (snap) => {
              const status = snap.data()?.status;
              if (status === "ready") {
                setStage("ready");
                unsubscribeRef.current?.();
                unsubscribeRef.current = null;
                Toast.show({ type: "success", text1: "Banner is live" });
                onUploaded?.();
              } else if (status === "failed") {
                setStage("failed");
                setFailureMessage(snap.data()?.error ?? "Processing failed");
                unsubscribeRef.current?.();
                unsubscribeRef.current = null;
              }
            });
          }
        );
      } catch (error: any) {
        console.error("Banner upload failed:", error);
        setStage("failed");
        setFailureMessage(error?.message ?? "Upload failed");
      }
    };

    const busy = stage === "uploading" || stage === "processing";

    return (
      <TrueSheet ref={ref} detents={["auto"]} cornerRadius={24} grabber>
        <View style={styles.container}>
          <Text style={styles.title}>Upload Banner</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sponsor spotlight"
            placeholderTextColor={colors.placeholder}
            value={name}
            onChangeText={setName}
            editable={!busy}
          />

          <TouchableOpacity
            style={[styles.pickButton, image && styles.pickButtonSelected]}
            onPress={pickImage}
            disabled={busy}
          >
            <Text style={styles.pickButtonText} numberOfLines={1}>
              {image
                ? image.fileName || "Image selected ✓"
                : "Choose a banner image"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>
            Show during (none = default banner)
          </Text>
          {videoOptions.length === 0 ? (
            <Text style={styles.emptyText}>No ready videos yet</Text>
          ) : (
            <View style={styles.chipWrap}>
              {videoOptions.map((video) => {
                const selected = selectedVideoIds.includes(video.file);
                return (
                  <TouchableOpacity
                    key={video.file}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleVideo(video.file)}
                    disabled={busy}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {video.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {stage === "uploading" && (
            <View style={styles.statusRow}>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${uploadPercent}%` }]}
                />
              </View>
              <Text style={styles.statusText}>Uploading… {uploadPercent}%</Text>
            </View>
          )}

          {stage === "processing" && (
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.statusText}>Optimizing image…</Text>
            </View>
          )}

          {stage === "ready" && (
            <Text style={[styles.statusText, { color: colors.primary }]}>
              ✓ Banner is live in the carousel.
            </Text>
          )}

          {stage === "failed" && (
            <Text style={styles.errorText}>
              Upload failed{failureMessage ? `: ${failureMessage}` : ""}
            </Text>
          )}

          {stage === "ready" || stage === "failed" ? (
            <TouchableOpacity style={styles.uploadButton} onPress={reset}>
              <Text style={styles.uploadButtonText}>Upload Another</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.uploadButton, busy && styles.uploadButtonDisabled]}
              onPress={startUpload}
              disabled={busy}
            >
              <Text style={styles.uploadButtonText}>
                {busy ? "Working…" : "Upload"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TrueSheet>
    );
  }
);

BannerUploadSheet.displayName = "BannerUploadSheet";

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    container: {
      padding: 20,
      paddingBottom: 40,
      gap: 12,
    },
    title: {
      ...typography.title,
      color: colors.text,
      textAlign: "center",
    },
    label: {
      ...typography.body,
      color: colors.text,
    },
    input: {
      ...typography.body,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    pickButton: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
    },
    pickButtonSelected: {
      backgroundColor: colors.inputBackground,
      borderWidth: 2,
    },
    pickButtonText: {
      ...typography.body,
      color: colors.primary,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      maxWidth: "100%",
    },
    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    chipText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    chipTextSelected: {
      color: colors.primary,
    },
    emptyText: {
      ...typography.bodySmall,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    statusRow: {
      alignItems: "center",
      gap: 8,
    },
    statusText: {
      ...typography.body,
      color: colors.text,
      textAlign: "center",
    },
    errorText: {
      ...typography.body,
      color: "#e05555",
      textAlign: "center",
    },
    progressTrack: {
      width: "100%",
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    uploadButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 14,
      alignItems: "center",
      marginTop: 4,
    },
    uploadButtonDisabled: {
      opacity: 0.5,
    },
    uploadButtonText: {
      ...typography.body,
      color: "#FFFFFF",
      fontWeight: "bold",
    },
  });

export default BannerUploadSheet;
