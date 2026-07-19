import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { Image } from "expo-image";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ChevronDown, ChevronUp, ImageIcon, Trash2 } from "lucide-react-native";
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
import { CatalogBanner } from "@/types/banners";
import type { BannerVideoOption } from "./bannerUploadSheet";

interface Props {
  /** Ready+active videos a banner can be attached to */
  videoOptions: BannerVideoOption[];
  /** Called after any change, in case a caller wants to refresh */
  onChanged?: () => void;
}

const sortBanners = (list: CatalogBanner[]) =>
  [...list].sort(
    (a, b) =>
      (a.order ?? 0) - (b.order ?? 0) ||
      ((a.createdAt as any)?.toMillis?.() ?? 0) -
        ((b.createdAt as any)?.toMillis?.() ?? 0)
  );

const ManageBannersSheet = forwardRef<TrueSheet, Props>(
  ({ videoOptions, onChanged }, ref) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(makeStyles);

    const [items, setItems] = useState<CatalogBanner[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const load = useCallback(async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(
          query(collection(FIRESTORE_DB, "banners"))
        );
        setItems(
          sortBanners(
            snapshot.docs.map(
              (d) => ({ id: d.id, ...d.data() }) as CatalogBanner
            )
          )
        );
      } catch (error) {
        console.log("Failed to load banner list:", error);
      } finally {
        setLoading(false);
      }
    }, []);

    const setActive = async (item: CatalogBanner, active: boolean) => {
      setBusyId(item.id);
      try {
        await updateDoc(doc(FIRESTORE_DB, "banners", item.id), {
          active,
          updatedAt: serverTimestamp(),
        });
        setItems((prev) =>
          prev.map((b) => (b.id === item.id ? { ...b, active } : b))
        );
        onChanged?.();
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Update failed",
          text2: error?.message,
        });
      } finally {
        setBusyId(null);
      }
    };

    // Swaps the order values of the banner and its neighbor so the pair trade
    // places; normalizes equal orders (fresh uploads all start at 0) first.
    const move = async (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return;
      const a = items[index];
      const b = items[target];
      let orderA = b.order ?? 0;
      let orderB = a.order ?? 0;
      if (orderA === orderB) {
        orderA = direction === -1 ? orderB - 1 : orderB + 1;
      }
      setBusyId(a.id);
      try {
        await Promise.all([
          updateDoc(doc(FIRESTORE_DB, "banners", a.id), {
            order: orderA,
            updatedAt: serverTimestamp(),
          }),
          updateDoc(doc(FIRESTORE_DB, "banners", b.id), {
            order: orderB,
            updatedAt: serverTimestamp(),
          }),
        ]);
        setItems((prev) =>
          sortBanners(
            prev.map((x) =>
              x.id === a.id
                ? { ...x, order: orderA }
                : x.id === b.id
                  ? { ...x, order: orderB }
                  : x
            )
          )
        );
        onChanged?.();
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Reorder failed",
          text2: error?.message,
        });
      } finally {
        setBusyId(null);
      }
    };

    const toggleAssignment = async (item: CatalogBanner, videoId: string) => {
      const current = item.videoIds ?? [];
      const next = current.includes(videoId)
        ? current.filter((x) => x !== videoId)
        : [...current, videoId];
      setBusyId(item.id);
      try {
        await updateDoc(doc(FIRESTORE_DB, "banners", item.id), {
          videoIds: next,
          updatedAt: serverTimestamp(),
        });
        setItems((prev) =>
          prev.map((b) => (b.id === item.id ? { ...b, videoIds: next } : b))
        );
        onChanged?.();
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Update failed",
          text2: error?.message,
        });
      } finally {
        setBusyId(null);
      }
    };

    const confirmDelete = (item: CatalogBanner) => {
      Alert.alert(
        "Delete permanently?",
        `“${item.name}” will be removed from the carousel for everyone. This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setBusyId(item.id);
              try {
                const deleteBanner = httpsCallable(functions, "deleteBanner");
                await deleteBanner({ bannerId: item.id });
                setItems((prev) => prev.filter((b) => b.id !== item.id));
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

    const assignmentSummary = (item: CatalogBanner) =>
      item.videoIds?.length
        ? `${item.videoIds.length} video${item.videoIds.length === 1 ? "" : "s"}`
        : "Default";

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
            <Text style={styles.title}>Manage Banners</Text>
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
              <Text style={styles.emptyText}>No banners yet.</Text>
            }
            renderItem={({ item, index }) => (
              <View>
                <View style={styles.row}>
                  {item.downloadURL ? (
                    <Image
                      source={{ uri: item.downloadURL }}
                      contentFit="cover"
                      style={styles.thumb}
                    />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <ImageIcon size={18} color={colors.primary} />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.rowText}
                    onPress={() =>
                      setExpandedId(expandedId === item.id ? null : item.id)
                    }
                  >
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.status,
                        item.status === "failed" && { color: "#e05555" },
                      ]}
                    >
                      {item.status === "ready"
                        ? assignmentSummary(item)
                        : item.status}
                      {item.status === "ready" && !item.active
                        ? " · hidden"
                        : ""}
                    </Text>
                  </TouchableOpacity>
                  {busyId === item.id ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <View style={styles.reorderButtons}>
                        <TouchableOpacity
                          style={styles.reorderButton}
                          onPress={() => move(index, -1)}
                          disabled={index === 0}
                        >
                          <ChevronUp
                            size={18}
                            color={
                              index === 0 ? colors.border : colors.primary
                            }
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.reorderButton}
                          onPress={() => move(index, 1)}
                          disabled={index === items.length - 1}
                        >
                          <ChevronDown
                            size={18}
                            color={
                              index === items.length - 1
                                ? colors.border
                                : colors.primary
                            }
                          />
                        </TouchableOpacity>
                      </View>
                      <Switch
                        trackColor={{
                          false: colors.border,
                          true: colors.primary,
                        }}
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
                {expandedId === item.id && (
                  <View style={styles.assignSection}>
                    <Text style={styles.assignLabel}>
                      Show during (none = default banner)
                    </Text>
                    {videoOptions.length === 0 ? (
                      <Text style={styles.emptyText}>No ready videos yet</Text>
                    ) : (
                      <View style={styles.chipWrap}>
                        {videoOptions.map((video) => {
                          const selected = (item.videoIds ?? []).includes(
                            video.file
                          );
                          return (
                            <TouchableOpacity
                              key={video.file}
                              style={[
                                styles.chip,
                                selected && styles.chipSelected,
                              ]}
                              onPress={() =>
                                toggleAssignment(item, video.file)
                              }
                              disabled={busyId === item.id}
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
                  </View>
                )}
              </View>
            )}
          />
        )}
      </TrueSheet>
    );
  }
);

ManageBannersSheet.displayName = "ManageBannersSheet";

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
    reorderButtons: {
      flexDirection: "column",
    },
    reorderButton: {
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    deleteButton: {
      padding: 6,
    },
    assignSection: {
      paddingVertical: 10,
      paddingLeft: 66,
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    assignLabel: {
      ...typography.bodySmall,
      color: colors.textSecondary,
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
  });

export default ManageBannersSheet;
