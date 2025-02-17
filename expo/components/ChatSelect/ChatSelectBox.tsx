import { Group, User } from "@/types/types";
import {
  Button,
  Pressable,
  View,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { router } from "expo-router";

export const ChatSelectBox = (props: { group: Group; isLast: boolean }) => {
  const { group, isLast } = props;
  return (
    <View className={Platform.OS != "web" ? "w-full" : "w-[250]"}>
      <Pressable
        className={`${isLast ? "border-b" : ""} flex items-start justify-center h-[40] border-t border-blue-950`}
        onPress={() => {
          router.push(`/groups/${group.id}`);
        }}
      >
        <Text numberOfLines={1} className="px-[10]">
          {group.name}
        </Text>
      </Pressable>
    </View>
  );
};
