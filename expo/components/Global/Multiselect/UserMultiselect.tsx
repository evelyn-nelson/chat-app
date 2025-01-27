import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import Fuse from "fuse.js";
import { User } from "@/types/types";

const UserMultiSelect = (props: {
  placeholderText: string;
  tags: string[];
  options: User[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  excludedUserList: User[];
  setExcludedUserList: React.Dispatch<React.SetStateAction<User[]>>;
}) => {
  const {
    placeholderText,
    tags,
    options,
    setTags,
    excludedUserList,
    setExcludedUserList,
  } = props;

  const isUserAvailable = (user: User) => {
    const isExcluded = excludedUserList.some(
      (excluded) => excluded.id === user.id
    );
    const isSelected = tags.includes(user.email);
    return !isExcluded && !isSelected;
  };

  const [currentText, setCurrentText] = useState<string>("");

  const [availableOptions, setAvailableOptions] = useState<User[]>(
    options.filter(isUserAvailable)
  );

  const [filteredOptions, setFilteredOptions] = useState<User[]>(
    options.filter(isUserAvailable)
  );

  useEffect(() => {
    const newAvailableOptions = options.filter(isUserAvailable);
    setAvailableOptions(newAvailableOptions);
    setFilteredOptions(currentText ? filteredOptions : newAvailableOptions);
  }, [excludedUserList, tags, options]);

  const fuse = useMemo(
    () =>
      new Fuse(availableOptions, {
        keys: ["email", "username"],
        threshold: 0.2,
        includeScore: true,
      }),
    [availableOptions]
  );

  const inputRef = useRef<TextInput | null>(null);

  const handleSelectUser = (email: string) => {
    setTags((prevTags) => [...prevTags, email]);
    setCurrentText("");
    inputRef.current?.focus();
  };

  const handleRemoveTag = (index: number) => {
    setTags((prevTags) => prevTags.filter((_, tagIndex) => tagIndex !== index));
  };

  return (
    <View>
      <View style={styles.tagsContainer}>
        {tags.map((tag, index) => {
          return (
            <View key={index}>
              <Pressable
                onPress={() => {
                  handleRemoveTag(index);
                }}
              >
                {({ pressed }) => (
                  <View style={styles.tagBox}>
                    <Text numberOfLines={1} style={styles.tagText}>
                      {tag}
                    </Text>
                    <View style={styles.closeIcon}>
                      <Ionicons
                        name={"close-circle-outline"}
                        size={15}
                        color={pressed ? "gray" : "white"}
                      />
                    </View>
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
      <View>
        <TextInput
          placeholder={placeholderText}
          ref={inputRef}
          style={styles.input}
          onChangeText={(text) => {
            setCurrentText(text);
            const searchResults = text
              ? fuse.search(text).map((result) => result.item)
              : availableOptions;
            setFilteredOptions(searchResults);
          }}
          value={currentText}
          blurOnSubmit={false}
          onSubmitEditing={() => {
            if (currentText) {
              handleSelectUser(currentText);
            }
            inputRef.current?.focus();
          }}
        />
        {currentText && filteredOptions.length > 0 ? (
          <View style={styles.searchOptions}>
            <ScrollView>
              {filteredOptions.map((option) => {
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelectUser(option.email)}
                    style={styles.optionItem}
                  >
                    <Text>{option.username}</Text>
                    <Text style={styles.emailText}>{option.email}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View />
        )}
      </View>
    </View>
  );
};

export default UserMultiSelect;

const styles = StyleSheet.create({
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 5,
    maxWidth: 250,
  },
  tagBox: {
    flexDirection: "row",
    marginTop: 3,
    marginLeft: 4,
    marginRight: 1,
    padding: 4,
    borderRadius: 20,
    backgroundColor: "cornflowerblue",
    maxHeight: 25,
    maxWidth: 245,
  },
  tagText: {
    color: "white",
    overflow: "hidden",
  },
  closeIcon: {
    marginLeft: 5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    height: 40,
    width: 250,
    borderWidth: 1,
    padding: 10,
  },
  searchOptions: {
    maxHeight: 120,
    width: 250,
    borderWidth: 1,
    borderTopWidth: 0,
  },
  optionItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  emailText: {
    fontSize: 12,
    color: "#666",
  },
});
