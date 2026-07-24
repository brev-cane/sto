import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { File as FsFile } from "expo-file-system";
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

type PickedMedia = {
  kind: "video" | "audio";
  uri: string;
  mimeType: string;
  label: string;
};

interface Props {
  /** Called when a new video reaches "ready", so the picker list can refresh */
  onUploaded?: () => void;
}

const VideoUploadSheet = forwardRef<TrueSheet, Props>(({ onUploaded }, ref) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [name, setName] = useState("");
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [thumbAsset, setThumbAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => () => unsubscribeRef.current?.(), []);

  const reset = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setName("");
    setMedia(null);
    setThumbAsset(null);
    setStage("idle");
    setUploadPercent(0);
    setFailureMessage(null);
  }, []);

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMedia({
        kind: "video",
        uri: asset.uri,
        mimeType: asset.mimeType ?? "video/mp4",
        label: asset.fileName || "Video selected ✓",
      });
    }
  };

  const pickAudio = async () => {
    const picked = await FsFile.pickFileAsync({ mimeTypes: ["audio/*"] });
    if (!picked.canceled && picked.result) {
      const file = picked.result;
      setMedia({
        kind: "audio",
        uri: file.uri,
        mimeType: file.type || "audio/mpeg",
        label: file.name || "Sound selected ✓",
      });
    }
  };

  const pickThumbnail = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
    });
    if (!result.canceled && result.assets[0]) {
      setThumbAsset(result.assets[0]);
    }
  };

  const uploadBlob = async (uri: string) => (await fetch(uri)).blob();

  const startUpload = async () => {
    if (!name.trim()) {
      Toast.show({ type: "error", text1: "Enter a name" });
      return;
    }
    if (!media) {
      Toast.show({ type: "error", text1: "Pick a video or sound first" });
      return;
    }

    try {
      setStage("uploading");
      setUploadPercent(0);
      setFailureMessage(null);

      const videoId = doc(collection(FIRESTORE_DB, "videos")).id;
      const docRef = doc(FIRESTORE_DB, "videos", videoId);
      await setDoc(docRef, {
        name: name.trim(),
        status: "processing",
        active: true,
        mediaType: media.kind,
        version: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Thumbnail goes up first so the transcode function (triggered by the
      // original) already finds it in place.
      if (thumbAsset) {
        const thumbBlob = await uploadBlob(thumbAsset.uri);
        await uploadBytesResumable(
          storageRef(FIREBASE_STORAGE, `uploads/${videoId}/thumbnail.jpg`),
          thumbBlob,
          { contentType: thumbAsset.mimeType ?? "image/jpeg" }
        );
      }

      const blob = await uploadBlob(media.uri);
      const task = uploadBytesResumable(
        storageRef(FIREBASE_STORAGE, `uploads/${videoId}/original.mp4`),
        blob,
        {
          contentType: media.mimeType,
          customMetadata: { name: name.trim() },
        }
      );

      task.on(
        "state_changed",
        (snapshot) => {
          setUploadPercent(
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          );
        },
        (error) => {
          console.error("Video upload failed:", error);
          setStage("failed");
          setFailureMessage(error.message);
        },
        () => {
          // Upload done — the transcode function takes over. Watch the doc so
          // the admin sees processing flip to ready/failed live.
          setStage("processing");
          unsubscribeRef.current = onSnapshot(docRef, (snap) => {
            const status = snap.data()?.status;
            if (status === "ready") {
              setStage("ready");
              unsubscribeRef.current?.();
              unsubscribeRef.current = null;
              Toast.show({ type: "success", text1: "Media is ready to use" });
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
      console.error("Video upload failed:", error);
      setStage("failed");
      setFailureMessage(error?.message ?? "Upload failed");
    }
  };

  const busy = stage === "uploading" || stage === "processing";

  return (
    <TrueSheet ref={ref} detents={["auto"]} cornerRadius={24} grabber>
      <View style={styles.container}>
        <Text style={styles.title}>Upload New Media</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Mr Brightside"
          placeholderTextColor={colors.placeholder}
          value={name}
          onChangeText={setName}
          editable={!busy}
        />

        <View style={styles.pickRow}>
          <TouchableOpacity
            style={[
              styles.pickButton,
              styles.pickButtonHalf,
              media?.kind === "video" && styles.pickButtonSelected,
            ]}
            onPress={pickVideo}
            disabled={busy}
          >
            <Text style={styles.pickButtonText} numberOfLines={1}>
              {media?.kind === "video" ? media.label : "Choose a video"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pickButton,
              styles.pickButtonHalf,
              media?.kind === "audio" && styles.pickButtonSelected,
            ]}
            onPress={pickAudio}
            disabled={busy}
          >
            <Text style={styles.pickButtonText} numberOfLines={1}>
              {media?.kind === "audio" ? media.label : "♪ Choose a sound"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.pickButton}
          onPress={pickThumbnail}
          disabled={busy}
        >
          <Text style={styles.pickButtonText} numberOfLines={1}>
            {thumbAsset
              ? thumbAsset.fileName || "Thumbnail selected ✓"
              : media?.kind === "audio"
                ? "Thumbnail (recommended for sounds)"
                : "Thumbnail (optional)"}
          </Text>
        </TouchableOpacity>

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
            <Text style={styles.statusText}>
              Optimizing video… this can take a minute
            </Text>
          </View>
        )}

        {stage === "ready" && (
          <Text style={[styles.statusText, { color: colors.primary }]}>
            ✓ Ready! It&apos;s now available in the picker.
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
});

VideoUploadSheet.displayName = "VideoUploadSheet";

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
    pickRow: {
      flexDirection: "row",
      gap: 10,
    },
    pickButton: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
    },
    pickButtonHalf: {
      flex: 1,
    },
    pickButtonSelected: {
      backgroundColor: colors.inputBackground,
      borderWidth: 2,
    },
    pickButtonText: {
      ...typography.body,
      color: colors.primary,
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

export default VideoUploadSheet;
