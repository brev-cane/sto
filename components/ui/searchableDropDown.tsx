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

interface ItemType {
  file: string;
  name: string;
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
        <Text style={{}}>{selectedLabel || placeholder || "Select"}</Text>
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
                  <Text style={{}}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: { padding: 12, borderColor: "#ccc", borderRadius: 8 },
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  dropdown: {
    width: "80%",
    maxHeight: 300,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 10,
  },
  searchBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});

export default SearchableDropdown;
