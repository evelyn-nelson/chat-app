import "react-native-get-random-values";
import ChatBox from "@/components/ChatBox/ChatBox";
import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import { Group } from "@/types/types";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { validate } from "uuid";

const GroupPage = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, store, groupsRefreshKey } = useGlobalStore();

  const [currentGroup, setCurrentGroup] = useState<Group | null | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!store || !id) {
      if (!id && user) {
        router.replace("/groups");
      }
      return;
    }

    if (!validate(id)) {
      setCurrentGroup(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let isMounted = true;

    store
      .loadGroups()
      .then((savedGroups) => {
        if (!isMounted) return;
        if (savedGroups && savedGroups.length > 0) {
          const foundGroup = savedGroups.find((g) => g.id.toString() === id);
          setCurrentGroup(foundGroup || null);
        } else {
          setCurrentGroup(null);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("GroupPage: Error loading groups: ", error);
        setCurrentGroup(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, store, groupsRefreshKey, user]);

  useEffect(() => {
    if (!isLoading && currentGroup === null) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/groups");
      }
    }
  }, [isLoading, currentGroup, id]);

  if (!user) {
    return <Redirect href={"/(auth)"} />;
  }

  if (isLoading || currentGroup === undefined) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-2.5 text-base text-gray-100">Loading Group...</Text>
      </View>
    );
  }

  if (!currentGroup) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <Text className="text-lg text-red-400">Group not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-end bg-gray-900">
      {user && <ChatBox group_id={currentGroup.id.toString()} />}
    </View>
  );
};

export default GroupPage;
