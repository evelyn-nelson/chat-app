import { Pressable, Text, View } from "react-native";
import React, { useState } from "react";
import { Group, GroupUser } from "@/types/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useWebSocket } from "../context/WebSocketContext";
import { useGlobalStore } from "../context/GlobalStoreContext";

type UserListItemProps = {
  user: GroupUser;
  group: Group;
  index: number;
  currentUserIsAdmin?: boolean;
};

const UserListItem = (props: UserListItemProps) => {
  const { user, group, index, currentUserIsAdmin } = props;

  const [hidden, setHidden] = useState(false);

  const { removeUserFromGroup } = useWebSocket();
  const { user: self } = useGlobalStore();

  const isTargetUserAdmin = user.admin;
  const isSelf = self?.id === user.id;

  if (hidden) {
    return <View />;
  }

  const canKickUser = currentUserIsAdmin && !isTargetUserAdmin && !isSelf;

  return (
    <View className={`${index !== 0 ? "border-t border-gray-700" : ""} w-full`}>
      <View className="flex-row items-center px-4 py-3">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text
              numberOfLines={1}
              className={`font-medium text-base ${
                isTargetUserAdmin ? "text-blue-400" : "text-gray-200"
              }`}
            >
              {user.username}
            </Text>
            {isTargetUserAdmin && (
              <View className="ml-2 px-2 py-0.5 bg-blue-900/30 rounded-full">
                <Text className="text-xs text-blue-400">Admin</Text>
              </View>
            )}
            {isSelf && (
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

        {canKickUser && (
          <Pressable
            className="w-8 h-8 rounded-full items-center justify-center active:bg-gray-700" // Added active state
            onPress={() => {
              if (self && group && user) {
                removeUserFromGroup(user.email, group.id);
                setHidden(true);
              }
            }}
          >
            {({ pressed }) => (
              <Ionicons
                color={pressed ? "#6B7280" : "#9CA3AF"} // Adjusted pressed color
                name={"close-circle-outline"}
                size={22}
              />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default UserListItem;
