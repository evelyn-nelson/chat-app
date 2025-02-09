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
    <View className="flex-row items-center px-[10]">
      <View className="flex-1">
        <Text numberOfLines={1} className="font-bold text-blue-950">
          {user.username}
        </Text>
        <Text numberOfLines={1} ellipsizeMode="tail" className="text-sky-700">
          {user.email}
        </Text>
      </View>
      {!user.admin && self?.id != user.id && (
        <Pressable
          className="w-[30] h-full flex-row-reverse"
          onPress={() => {
            if (user && group) {
              removeUserFromGroup(user.email, group.id);
            }
          }}
        >
          {({ pressed }) => (
            <Ionicons
              className="my-auto self-start"
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
