import { Image } from "expo-image";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
} from "react-native";
import { Theme, useTheme, useThemedStyles } from "@/theme";

interface ItemType {
  file: string;
  name: string;
  thumbnailURL?: string;
  // add any other fields you need
}

interface Props {
  options: ItemType[];
  labelKey?: keyof ItemType; // field to show in dropdown
  onSelect: (item: ItemType) => void;
  placeholder?: string;
}

const SearchableDropdown: React.FC<Props> = ({
  options,
  onSelect,
  placeholder,
}) => {
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(item: ItemType) {
    setSelectedLabel(item.name)
    setVisible(false);
    setSearch("");
    onSelect(item);
  }

  return (
    <View>
      <TouchableOpacity
        style={[styles.inputWrapper]}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.valueText}>{selectedLabel || placeholder || "Select"}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackground}
          activeOpacity={1}
          onPressOut={() => setVisible(false)}
        >
          <View style={styles.dropdown}>
            <TextInput
              style={[styles.searchBox]}
              placeholder={"Search"}
              placeholderTextColor={colors.placeholder}
              value={search}
              onChangeText={setSearch}
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.file}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option]}
                  onPress={() => handleSelect(item)}
                >
                  {item.thumbnailURL ? (
                    <Image
                      source={{ uri: item.thumbnailURL }}
                      contentFit="cover"
                      style={styles.thumbnail}
                    />
                  ) : null}
                  <Text style={styles.optionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    inputWrapper: { padding: 12, borderColor: colors.border, borderRadius: 8 },
    valueText: {
      ...typography.body,
      color: colors.text,
    },
    modalBackground: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.overlay,
    },
    dropdown: {
      width: "80%",
      maxHeight: 300,
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 10,
    },
    searchBox: {
      ...typography.body,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 8,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    option: {
      paddingVertical: 12,
      paddingHorizontal: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    optionText: {
      ...typography.body,
      color: colors.text,
    },
    thumbnail: {
      width: 48,
      height: 32,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
  });

export default SearchableDropdown;
