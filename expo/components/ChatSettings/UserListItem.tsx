import { Pressable, Text, View } from "react-native";
import React from "react";
import { Group, GroupUser } from "@/types/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useWebSocket } from "../context/WebSocketContext";
import { useGlobalStore } from "../context/GlobalStoreContext";

const UserListItem = (props: { user: GroupUser; group: Group }) => {
  const { user, group } = props;

  const { removeUserFromGroup } = useWebSocket();
  const { user: self } = useGlobalStore();

  const isAdmin = user.admin;
  const isSelf = self?.id === user.id;

  return (
    <View className="flex-row items-center px-4 py-3">
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text
            numberOfLines={1}
            className={`font-medium text-base ${isAdmin ? "text-blue-400" : "text-gray-200"}`}
          >
            {user.username}
          </Text>
          {isAdmin && (
            <View className="ml-2 px-2 py-0.5 bg-blue-900/30 rounded-full">
              <Text className="text-xs text-blue-400">Admin</Text>
            </View>
          )}
          {isSelf && !isAdmin && (
            <View className="ml-2 px-2 py-0.5 bg-gray-700 rounded-full">
              <Text className="text-xs text-gray-400">You</Text>
            </View>
          )}
        </View>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className="text-sm text-gray-400"
        >
          {user.email}
        </Text>
      </View>
      {!isAdmin && !isSelf && (
        <Pressable
          className="w-8 h-8 rounded-full items-center justify-center"
          onPress={() => {
            if (user && group) {
              removeUserFromGroup(user.email, group.id);
            }
          }}
        >
          {({ pressed }) => (
            <Ionicons
              color={pressed ? "#4B5563" : "#9CA3AF"}
              name={"close-circle-outline"}
              size={22}
            />
          )}
        </Pressable>
      )}
    </View>
  );
};

export default UserListItem;
