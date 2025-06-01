import ChatSettingsMenu from "@/components/ChatSettings/ChatSettingsMenu";
import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import ExpoRouterModal from "@/components/Global/Modal/ExpoRouterModal";
import { Group } from "@/types/types"; // Ensure this path is correct
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

  // Group not found or error loading group
  // `group === null` indicates an attempt was made but failed or data not found.
  if (group === null) {
    return (
      <ExpoRouterModal title="Error">
        <View className="flex-1 justify-center items-center p-4">
          <Text>Group settings not available or group not found.</Text>
        </View>
      </ExpoRouterModal>
    );
  }

  // If group is still undefined after isLoading is false (e.g. id became null), treat as error/not found.
  // This case should ideally be covered by `group === null` after the effect runs.
  // Redundant if the useEffect correctly sets group to null when id is missing.
  if (group === undefined && !isLoading) {
    return (
      <ExpoRouterModal title="Error">
        <View className="flex-1 justify-center items-center p-4">
          <Text>Group information is unavailable.</Text>
        </View>
      </ExpoRouterModal>
    );
  }

  // Group data is available, render the settings menu
  // At this point, group should be a valid Group object.
  if (group) {
    return (
      <ExpoRouterModal title="Group Settings">
        <ChatSettingsMenu group={group} onUserKicked={handleUserKicked} />
      </ExpoRouterModal>
    );
  }

  // Fallback for any unexpected state, though ideally covered above.
  // Or, if `isLoading` is true but `group` has old data, you might still show loading.
  // The primary loading condition `isLoading && group === undefined` handles initial load.
  // If you want to show loading overlay even when displaying stale data during refresh:
  if (isLoading) {
    // This will show loading if a refresh is happening and group has stale data
    return (
      <ExpoRouterModal title="Refreshing Settings...">
        <View className="flex-1 justify-center items-center p-4">
          <ActivityIndicator size="large" color="#3B82F6" />
          {/* Optionally, you could render ChatSettingsMenu with stale 'group' data underneath */}
          {/* if 'group' is not undefined/null and you prefer that UX during refresh */}
        </View>
      </ExpoRouterModal>
    );
  }

  // Should not be reached if logic above is complete
  return null;
};

export default ChatSettings;
