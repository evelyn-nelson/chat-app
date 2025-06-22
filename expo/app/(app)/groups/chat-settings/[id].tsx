import ChatSettingsMenu from "@/components/ChatSettings/ChatSettingsMenu";
import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import ExpoRouterModal from "@/components/Global/Modal/ExpoRouterModal";
import { Group } from "@/types/types";
import { useLocalSearchParams } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { validate } from "uuid";

const deepObjectEquals = (objA: any, objB: any): boolean => {
  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return objA === objB;
  }
  return JSON.stringify(objA) === JSON.stringify(objB);
};

const ChatSettings = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { store, groupsRefreshKey } = useGlobalStore();

  const [group, setGroup] = useState<Group | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!store || !id) {
      setIsLoading(false);
      setGroup(null);
      return;
    }

    if (!validate(id)) {
      setIsLoading(false);
      setGroup(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    store
      .loadGroups()
      .then((allGroups) => {
        if (isMounted) {
          const newGroupCandidate = allGroups
            ? allGroups.find((g) => g.id.toString() === id) || null
            : null;

          setGroup((currentSpecificGroup) => {
            if (deepObjectEquals(currentSpecificGroup, newGroupCandidate)) {
              return currentSpecificGroup;
            }
            return newGroupCandidate;
          });
        }
      })
      .catch((error) => {
        console.error("ChatSettings: Error loading groups:", error);
        if (isMounted) {
          setGroup(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, store, groupsRefreshKey]);

  const handleUserKicked = useCallback((userId: string) => {
    setGroup((currentGroupValue) =>
      currentGroupValue
        ? {
            ...currentGroupValue,
            group_users: currentGroupValue.group_users.filter(
              (u) => u.id !== userId
            ),
          }
        : currentGroupValue
    );
  }, []);

  if (isLoading && group === undefined) {
    return (
      <ExpoRouterModal title="Loading Settings...">
        <View className="flex-1 justify-center items-center p-4">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </ExpoRouterModal>
    );
  }

  if (group === null) {
    return (
      <ExpoRouterModal title="Error">
        <View className="flex-1 justify-center items-center p-4">
          <Text>Group settings not available or group not found.</Text>
        </View>
      </ExpoRouterModal>
    );
  }

  if (group === undefined && !isLoading) {
    return (
      <ExpoRouterModal title="Error">
        <View className="flex-1 justify-center items-center p-4">
          <Text>Group information is unavailable.</Text>
        </View>
      </ExpoRouterModal>
    );
  }

  if (group) {
    return (
      <ExpoRouterModal title="Group Settings">
        <ChatSettingsMenu group={group} onUserKicked={handleUserKicked} />
      </ExpoRouterModal>
    );
  }

  if (isLoading) {
    return (
      <ExpoRouterModal title="Refreshing Settings...">
        <View className="flex-1 justify-center items-center p-4">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </ExpoRouterModal>
    );
  }

  return null;
};

export default ChatSettings;
