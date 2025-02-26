import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import { router, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Button,
  Pressable,
  View,
  Text,
  StyleSheet,
  BoxShadowValue,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Group } from "@/types/types";
import ChatSettingsModal from "@/components/ChatSettings/ChatSettingsModal";

type GroupParams = {
  id: string;
};

export default function GroupLayout() {
  const { store, groupsRefreshKey } = useGlobalStore();
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    store
      .loadGroups()
      .then((savedGroups) => setGroups(savedGroups))
      .catch((error) => console.error(error));
  }, [groupsRefreshKey]);

  const getGroup = (id: string) => {
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].id.toString() === id) {
        return groups[i];
      }
    }
  };

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={({ route }) => {
          const { id } = route.params as GroupParams;
          if (!Number(id)) {
            router.back();
          }
          const group = getGroup(id);
          return {
            title: group?.name ?? `Loading...`,
            headerShown: true,
            headerStyle: styles.shadow,
            headerLeft: () => {
              return (
                <Pressable
                  style={{
                    height: 40,
                    width: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => {
                    router.back();
                  }}
                >
                  <Ionicons name={"arrow-back"} size={20} />
                </Pressable>
              );
            },
            headerRight: () => {
              if (group) {
                return <ChatSettingsModal group={group} />;
              }
            },
          };
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  shadow: {
    backgroundColor: "#7faee3",
    shadowColor: "black",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.7,
    shadowRadius: 5,
    elevation: 5,
  },
});
