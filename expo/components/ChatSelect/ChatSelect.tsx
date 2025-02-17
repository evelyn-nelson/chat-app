import {
  View,
  Text,
  StyleSheet,
  Button,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { ChatSelectBox } from "./ChatSelectBox";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { Group } from "@/types/types";
import { useState, useEffect, useCallback } from "react";
import ChatCreateModal from "./ChatCreate/ChatCreateModal";
import { useWebSocket } from "../context/WebSocketContext";

export const ChatSelect = () => {
  const { store, groupsRefreshKey, refreshGroups } = useGlobalStore();
  const { getGroups } = useWebSocket();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [groups, setGroups] = useState<Group[]>([]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getGroups();
      store.saveGroups(data);
      refreshGroups();
    } catch (error) {
      console.error(error);
    }
    setTimeout(() => {
      setRefreshing(false);
    }, 300);
  }, []);

  useEffect(() => {
    store
      .loadGroups()
      .then((savedGroups) => setGroups(savedGroups))
      .catch((error) => console.error(error));
  }, [groupsRefreshKey]);

  return (
    <View
      className={`${
        Platform.OS != "web" ? "w-full" : "w-[250]"
      } flex-1 pt-[50] border-r-2
      `}
    >
      <ChatCreateModal />
      <View className="h-1" />
      <ScrollView
        className="bg-blue-300 flex-1 w-full h-full"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "flex-start",
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={60}
          />
        }
      >
        {groups.map((group, index) => {
          const isLast = index === groups.length - 1;
          return (
            <ChatSelectBox
              key={group.id || index}
              group={{
                ...group,
              }}
              isLast={isLast}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};