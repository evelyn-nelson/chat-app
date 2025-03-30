import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Platform,
  SafeAreaView,
  StatusBar,
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

  // Get status bar height for proper padding
  const statusBarHeight = StatusBar.currentHeight || 0;
  const topPadding = Platform.OS === "ios" ? 50 : statusBarHeight + 16;

  return (
    <SafeAreaView
      className={`${
        Platform.OS !== "web" ? "w-full" : "w-[280px]"
      } flex-1 bg-gray-900 border-r border-gray-700`}
      style={{
        paddingTop: Platform.OS === "web" ? 16 : topPadding,
      }}
    >
      <View className="px-3 mb-2">
        <Text className="text-xl font-semibold text-blue-400 mb-3 px-1">
          Your Groups
        </Text>
        <ChatCreateModal />
      </View>

      <ScrollView
        className="flex-1 mt-3"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={60}
            tintColor="#60A5FA" // blue-400
            colors={["#60A5FA"]} // blue-400
          />
        }
      >
        <View className="bg-gray-800 mx-3 rounded-lg overflow-hidden">
          {groups.length > 0 ? (
            groups.map((group, index) => (
              <ChatSelectBox
                key={group.id || index}
                group={group}
                isFirst={index === 0}
                isLast={index === groups.length - 1}
              />
            ))
          ) : (
            <View className="py-6 px-4">
              <Text className="text-gray-400 text-center">
                No groups yet. Create a new group to get started.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
