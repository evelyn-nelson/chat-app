import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import { router, Stack } from "expo-router";
import React from "react";
import { Button, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

type GroupParams = {
  id: string;
};

export default function GroupLayout() {
  const { groups } = useGlobalStore();

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
          const group = getGroup(id);
          return {
            title: group?.name ?? `Loading...`,
            headerShown: true,
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
          };
        }}
      />
    </Stack>
  );
}
