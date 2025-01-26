import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import Fuse from "fuse.js";
import { User } from "@/types/types";

const UserMultiSelect = (props: {
  placeholderText: string;
  tags: string[];
  options: User[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  excludedUserList: User[];
  setExcludedUserList: User[];
}) => {
  const { placeholderText, tags, options, setTags } = props;
  const [currentText, setCurrentText] = useState<string>("");
  const [filteredOptions, setFilteredOptions] = useState<User[]>(options);

  const fuse = new Fuse(options, {
    keys: ["email", "username"],
    threshold: 0.2,
    includeScore: true,
  });

  const inputRef = useRef<TextInput | null>(null);
  return (
    <View>
      <View style={styles.tagsContainer}>
        {tags.map((tag, index) => {
          return (
            <View key={index}>
              <Pressable
                onPress={() => {
                  setTags((prevTags) => {
                    return prevTags.filter((_, tagIndex) => tagIndex !== index);
                  });
                }}
              >
                {({ pressed }) => (
                  <View style={styles.tagBox}>
                    <Text numberOfLines={1} style={styles.tagText}>
                      {tag}
                    </Text>
                    <View
                      style={{
                        marginLeft: 5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
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
          onChangeText={(event) => {
            setCurrentText(event);
            setFilteredOptions(() => {
              return fuse.search(event).map((result) => result.item);
            });
          }}
          value={currentText}
          blurOnSubmit={false}
          onSubmitEditing={() => {
            if (currentText) {
              setTags((prevTags) => {
                return [...prevTags, currentText];
              });
              setCurrentText("");
            }
            inputRef.current?.focus();
          }}
        />
        {currentText && filteredOptions.length > 0 ? (
          <View style={styles.searchOptions}>
            <ScrollView>
              {filteredOptions.map((option, index) => {
                return (
                  <Pressable
                    key={index}
                    onPress={() => {
                      setTags((prevTags) => {
                        return [...prevTags, option.email];
                      });
                      setCurrentText("");
                    }}
                  >
                    <Text>{option.username}</Text>
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
  input: {
    height: 40,
    width: 250,
    borderWidth: 1,
    padding: 10,
  },
  searchOptions: {
    maxHeight: 60,
    width: 250,
    borderWidth: 1,
  },
});
