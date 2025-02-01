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
    <View style={Platform.OS != "web" ? styles.nativeWidth : styles.webWidth}>
      <Pressable
        style={
          isLast
            ? [styles.container, styles.lastBox, styles.box]
            : [styles.container, styles.box]
        }
        onPress={() => {
          router.push(`/groups/${group.id}`);
        }}
      >
        <Text numberOfLines={1} style={styles.text}>
          {group.name}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  nativeWidth: {
    width: "100%",
  },
  webWidth: {
    width: 250,
  },
  container: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  box: {
    height: 40,
    borderTopWidth: 1,
  },
  lastBox: {
    borderBottomWidth: 1,
  },
  text: {
    paddingHorizontal: 10,
  },
});
