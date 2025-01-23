import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";

const TagInput = (props: {
  placeholderText: string;
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
}) => {
  const { placeholderText, tags, setTags } = props;
  const [currentText, setCurrentText] = useState<string>("");
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
      <TextInput
        placeholder={placeholderText}
        ref={inputRef}
        style={styles.input}
        onChangeText={(event) => {
          setCurrentText(event);
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
    </View>
  );
};

export default TagInput;

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
});
