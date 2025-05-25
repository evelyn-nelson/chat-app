import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Dimensions,
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
  const { width } = Dimensions.get("window");

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

  const truncateEmail = (email: string, maxLength = 20) => {
    if (email.length <= maxLength) return email;
    return email.substring(0, maxLength - 3) + "...";
  };

  return (
    <View className="w-full">
      <View className="h-28 mb-2 bg-gray-700 rounded-lg p-2">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          className="flex"
          contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap" }}
          showsVerticalScrollIndicator={true}
        >
          {tags.map((tag, index) => {
            const displayTag = truncateEmail(tag);
            return (
              <View key={index} className="m-1">
                <Pressable
                  onPress={() => {
                    handleRemoveTag(index);
                  }}
                >
                  {({ pressed }) => (
                    <View className="flex-row items-center p-2 px-3 rounded-full bg-blue-600">
                      <Text
                        numberOfLines={1}
                        className="text-white max-w-[150px]"
                      >
                        {displayTag}
                      </Text>
                      <Pressable
                        onPress={() => handleRemoveTag(index)}
                        className="ml-2 h-5 w-5 rounded-full bg-blue-700 items-center justify-center"
                      >
                        <Text className="text-white text-xs">×</Text>
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View className="relative z-20">
        <TextInput
          placeholder={placeholderText}
          ref={inputRef}
          className="h-12 w-full border border-gray-600 rounded-lg bg-gray-700 text-white px-3"
          placeholderTextColor="#9CA3AF"
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
          <View
            className="absolute max-h-40 w-full top-[100%] bg-gray-700 z-50 rounded-lg mt-1 border border-gray-600 shadow-lg"
            style={{ elevation: 5 }}
          >
            <ScrollView keyboardShouldPersistTaps="always">
              {filteredOptions.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => handleSelectUser(option.email)}
                  className="p-3 border-b border-gray-600"
                >
                  <Text className="text-white font-medium">
                    {option.username}
                  </Text>
                  <Text className="text-sm text-gray-400">{option.email}</Text>
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
