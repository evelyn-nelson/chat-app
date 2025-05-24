import ChatBox from "@/components/ChatBox/ChatBox";
import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import { Group } from "@/types/types";
import { Redirect, router, Stack, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

const GroupPage = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, store, groupsRefreshKey } = useGlobalStore();
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    store
      .loadGroups()
      .then((savedGroups) => setGroups(savedGroups))
      .catch((error) => console.error("Error loading groups: ", error));
  }, [groupsRefreshKey]);

  if (!user) {
    return <Redirect href={"/(auth)"} />;
  }

  return (
    <View className="flex justify-end h-[100%] bg-gray-900">
      {user && <ChatBox group_id={Number(id)} />}
    </View>
  );
};

export default GroupPage;
