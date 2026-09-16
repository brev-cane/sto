import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { Image } from "expo-image";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Music, Trash2 } from "lucide-react-native";
import React, { forwardRef, useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { FIRESTORE_DB, functions } from "@/FirebaseConfig";
import { Theme, useTheme, useThemedStyles } from "@/theme";
import { CatalogVideo } from "@/types/videos";

interface Props {
  /** Called after any activation change or delete, so the picker can refresh */
  onChanged?: () => void;
}

const ManageMediaSheet = forwardRef<TrueSheet, Props>(({ onChanged }, ref) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [items, setItems] = useState<CatalogVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(query(collection(FIRESTORE_DB, "videos")));
      const all = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as CatalogVideo)
        .sort(
          (a, b) =>
            ((b.createdAt as any)?.toMillis?.() ?? 0) -
            ((a.createdAt as any)?.toMillis?.() ?? 0)
        );
      setItems(all);
    } catch (error) {
      console.log("Failed to load media list:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const setActive = async (item: CatalogVideo, active: boolean) => {
    setBusyId(item.id);
    try {
      await updateDoc(doc(FIRESTORE_DB, "videos", item.id), { active });
      setItems((prev) =>
        prev.map((v) => (v.id === item.id ? { ...v, active } : v))
      );
      onChanged?.();
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Update failed", text2: error?.message });
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = (item: CatalogVideo) => {
    Alert.alert(
      "Delete permanently?",
      `“${item.name}” will be removed for everyone and devices will delete their downloaded copy. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusyId(item.id);
            try {
              const deleteMedia = httpsCallable(functions, "deleteMedia");
              await deleteMedia({ videoId: item.id });
              setItems((prev) => prev.filter((v) => v.id !== item.id));
              Toast.show({ type: "success", text1: "Deleted" });
              onChanged?.();
            } catch (error: any) {
              Toast.show({
                type: "error",
                text1: "Delete failed",
                text2: error?.message,
              });
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <TrueSheet
      ref={ref}
      detents={[0.6, 1]}
      cornerRadius={24}
      grabber
      scrollable
      onDidPresent={load}
      header={
        <View style={styles.header}>
          <Text style={styles.title}>Manage Media</Text>
        </View>
      }
    >
      {loading && items.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No uploaded media yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.thumbnailURL ? (
                <Image
                  source={{ uri: item.thumbnailURL }}
                  contentFit="cover"
                  style={styles.thumb}
                />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Music size={18} color={colors.primary} />
                </View>
              )}
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {(item.mediaType ?? "video") === "audio" ? "♪ " : ""}
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.status,
                    item.status === "failed" && { color: "#e05555" },
                  ]}
                >
                  {item.status}
                  {item.status === "ready" && !item.active ? " · hidden" : ""}
                </Text>
              </View>
              {busyId === item.id ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Switch
                    trackColor={{ false: colors.border, true: colors.primary }}
                    value={!!item.active}
                    onValueChange={(value) => setActive(item, value)}
                    disabled={item.status !== "ready"}
                  />
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => confirmDelete(item)}
                  >
                    <Trash2 size={20} color="#e05555" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        />
      )}
    </TrueSheet>
  );
});

ManageMediaSheet.displayName = "ManageMediaSheet";

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    header: {
      padding: 16,
      alignItems: "center",
    },
    title: {
      ...typography.title,
      color: colors.text,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    emptyText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 30,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    thumb: {
      width: 56,
      height: 36,
      borderRadius: 6,
      backgroundColor: colors.border,
    },
    thumbPlaceholder: {
      justifyContent: "center",
      alignItems: "center",
    },
    rowText: {
      flex: 1,
    },
    name: {
      ...typography.body,
      color: colors.text,
    },
    status: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    deleteButton: {
      padding: 6,
    },
  });

export default ManageMediaSheet;
