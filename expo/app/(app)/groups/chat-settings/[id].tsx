import ChatSettingsMenu from "@/components/ChatSettings/ChatSettingsMenu";
import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import ExpoRouterModal from "@/components/Global/Modal/ExpoRouterModal";
import { Group } from "@/types/types";
import { useLocalSearchParams } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { ActivityIndicator, View, Text } from "react-native";

const ChatSettings = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { store, groupsRefreshKey } = useGlobalStore();

  const [group, setGroup] = useState<Group | null | undefined>(undefined);

  useEffect(() => {
    if (id) {
      store
        .loadGroups()
        .then((allGroups) => {
          setGroup(allGroups.find((g) => g.id.toString() === id) || null);
        })
        .catch(() => setGroup(null));
    }
  }, [id, store, groupsRefreshKey]);

  const handleUserKicked = useCallback((userId: number) => {
    setGroup((g) =>
      g
        ? {
            ...g,
            group_users: g.group_users.filter((u) => u.id !== userId),
          }
        : g
    );
  }, []);

  if (group == null) {
    return (
      <ExpoRouterModal title="Loading Settings...">
        <View className="flex-1 justify-center items-center p-4">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </ExpoRouterModal>
    );
  }

  return (
    <ExpoRouterModal title="Group Settings">
      <ChatSettingsMenu group={group} onUserKicked={handleUserKicked} />
    </ExpoRouterModal>
  );
};

export default ChatSettings;
