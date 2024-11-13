import { Group, User } from "@/types/types";
import { Button, Pressable, View, Text } from "react-native";
import { router } from "expo-router";

export const ChatSelectBox = (props: { group: Group }) => {
  const { group } = props;
  return (
    <View>
      <Pressable
        onPress={() => {
          router.push({ pathname: "/group/[id]", params: { id: group.id } });
        }}
      >
        <Text>{group.name}</Text>
      </Pressable>
    </View>
  );
};
