import ChatSettingsMenu from "@/components/ChatSettings/ChatSettingsMenu";
import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import ExpoRouterModal from "@/components/Global/Modal/ExpoRouterModal";
import { Group } from "@/types/types";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

const ChatSettings = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { store, groupsRefreshKey } = useGlobalStore();
  const [group, setGroup] = useState<Group | null | undefined>(undefined);

  useEffect(() => {
    if (id) {
      store
        .loadGroups()
        .then((allGroups: Group[]) => {
          const foundGroup = allGroups.find((g) => g.id.toString() === id);
          setGroup(foundGroup || null);
        })
        .catch(() => setGroup(null));
    }
  }, [id, store, groupsRefreshKey]);

  if (!group) {
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
      <ChatSettingsMenu group={group} />
    </ExpoRouterModal>
  );
};

export default ChatSettings;
