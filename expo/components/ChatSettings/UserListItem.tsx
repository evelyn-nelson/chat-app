import { Pressable, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import { Group, GroupUser } from "@/types/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useWebSocket } from "../context/WebSocketContext";
import { useGlobalStore } from "../context/GlobalStoreContext";

const UserListItem = (props: { user: GroupUser; group: Group }) => {
  const { user, group } = props;

  const { removeUserFromGroup } = useWebSocket();
  const { user: self } = useGlobalStore();

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text numberOfLines={1} style={styles.username}>
          {user.username}
        </Text>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.email}>
          {user.email}
        </Text>
      </View>
      {!user.admin && self?.id != user.id && (
        <Pressable
          style={styles.iconContainer}
          onPress={() => {
            if (user && group) {
              removeUserFromGroup(user.email, group.id);
            }
          }}
        >
          {({ pressed }) => (
            <Ionicons
              style={styles.icon}
              color={pressed ? "gray" : "black"}
              name={"close-circle-outline"}
              size={20}
            />
          )}
        </Pressable>
      )}
    </View>
  );
};

export default UserListItem;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  textContainer: {
    flex: 1,
  },
  username: {
    fontWeight: "bold",
  },
  email: {
    color: "gray",
    overflow: "hidden",
  },
  iconContainer: {
    width: 30,
    height: "100%",
    flexDirection: "row-reverse",
  },
  icon: { marginVertical: "auto", alignSelf: "flex-start" },
});
