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
}) => {
  const { placeholderText, tags, options, setTags, excludedUserList } = props;

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
    <View className="w-[280]">
      <View className="h-24 mb-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          className="flex"
          contentContainerStyle={styles.tagsContainer}
          showsVerticalScrollIndicator={true}
        >
          {tags.map((tag, index) => {
            return (
              <View key={index} className="m-1">
                <Pressable
                  onPress={() => {
                    handleRemoveTag(index);
                  }}
                >
                  {({ pressed }) => (
                    <View className="flex-row p-1 rounded-3xl bg-blue-500 max-h-7 max-w-60">
                      <Text
                        numberOfLines={1}
                        className="text-white overflow-hidden"
                      >
                        {tag}
                      </Text>
                      <View className="ml-2 flex items-center justify-center">
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
        </ScrollView>
      </View>

      <View className="relative">
        <ScrollView keyboardShouldPersistTaps="always" scrollEnabled={false}>
          <TextInput
            placeholder={placeholderText}
            ref={inputRef}
            className="h-10 w-[280] border p-[10]"
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
        </ScrollView>
        {currentText && filteredOptions.length > 0 ? (
          <View className="absolute max-h-24 w-[280] border border-top-0 top-[100%] bg-white z-10">
            <ScrollView keyboardShouldPersistTaps="always">
              {filteredOptions.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => handleSelectUser(option.email)}
                  className="p-2 border-b border-white"
                >
                  <Text>{option.username}</Text>
                  <Text className="text-sm text-gray-500">{option.email}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default UserMultiSelect;

const styles = StyleSheet.create({
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
