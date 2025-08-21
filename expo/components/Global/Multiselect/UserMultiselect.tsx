import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useEffect, useRef, useState } from "react";
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

  const [currentText, setCurrentText] = useState<string>("");
  const [availableOptions, setAvailableOptions] = useState<User[]>([]);
  const [filteredOptions, setFilteredOptions] = useState<User[]>([]);

  useEffect(() => {
    const isUserAvailable = (user: User) => {
      const isExcluded = excludedUserList.some(
        (excluded) => excluded.id === user.id
      );
      const isSelected = tags.includes(user.email);
      return !isExcluded && !isSelected;
    };
    const newAvailableOptions = options.filter(isUserAvailable);
    setAvailableOptions(newAvailableOptions);
    if (currentText) {
      const localFuse = new Fuse(newAvailableOptions, {
        keys: ["email", "username"],
        threshold: 0.3,
        includeScore: true,
      });
      const searchResults = localFuse.search(currentText).map((r) => r.item);
      setFilteredOptions(searchResults);
    } else {
      setFilteredOptions(newAvailableOptions);
    }
  }, [excludedUserList, tags, options, currentText]);

  const inputRef = useRef<TextInput | null>(null);

  const handleSelectUser = (email: string) => {
    if (!tags.includes(email)) {
      setTags((prevTags) => [...prevTags, email]);
    }
    setCurrentText("");
    setFilteredOptions(availableOptions.filter((opt) => opt.email !== email));
    inputRef.current?.focus();
  };

  const handleRemoveTag = (emailToRemove: string) => {
    setTags((prevTags) => prevTags.filter((tag) => tag !== emailToRemove));
  };

  const truncateEmail = (email: string, maxLength = 20) => {
    if (email.length <= maxLength) return email;
    return email.substring(0, maxLength - 3) + "...";
  };

  const onSearchTextChange = (text: string) => {
    setCurrentText(text);
  };

  return (
    <View className="w-full">
      <View className="min-h-[60px] max-h-28 mb-2 bg-gray-700 rounded-lg p-2">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
          showsVerticalScrollIndicator={true}
        >
          {tags.map((tagEmail) => {
            const displayTag = truncateEmail(tagEmail);
            return (
              <View key={tagEmail} className="m-1">
                <Pressable
                  onPress={() => handleRemoveTag(tagEmail)}
                  className="flex-row items-center p-2 px-3 rounded-full bg-blue-600 active:bg-blue-700"
                >
                  <Text numberOfLines={1} className="text-white max-w-[150px]">
                    {displayTag}
                  </Text>
                  <View className="ml-2 h-5 w-5 rounded-full bg-blue-700 items-center justify-center">
                    <Text className="text-white text-xs">×</Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
          {tags.length === 0 && (
            <Text className="text-gray-400 p-2">No users selected.</Text>
          )}
        </ScrollView>
      </View>

      <View className="relative z-20">
        <TextInput
          placeholder={placeholderText}
          ref={inputRef}
          className="h-12 w-full border border-gray-600 rounded-lg bg-gray-700 text-white px-3"
          placeholderTextColor="#9CA3AF"
          onSubmitEditing={() => handleSelectUser(currentText)}
          onChangeText={onSearchTextChange}
          value={currentText}
          blurOnSubmit={false}
        />

        {currentText && (
          <View
            className="absolute max-h-40 w-full top-[100%] bg-gray-700 z-50 rounded-lg mt-1 border border-gray-600 shadow-lg"
            style={{ elevation: 5 }}
          >
            <ScrollView keyboardShouldPersistTaps="always">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelectUser(option.email)}
                    className="p-3 border-b border-gray-600 active:bg-gray-600"
                  >
                    <Text className="text-white font-medium">
                      {option.username}
                    </Text>
                    <Text className="text-sm text-gray-400">
                      {option.email}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <View className="p-3 items-center">
                  <Text className="text-gray-400">No users found.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
};

export default UserMultiSelect;
