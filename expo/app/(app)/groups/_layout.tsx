import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import { router, Stack } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View, Text, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Group } from "@/types/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GroupAvatarSmall from "@/components/GroupAvatarSmall";

type GroupParams = {
  id: string;
};

export default function GroupLayout() {
  const { store, groupsRefreshKey } = useGlobalStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    store
      .loadGroups()
      .then((savedGroups) => setGroups(savedGroups))
      .catch((error) => console.error("Error loading groups: ", error));
  }, [groupsRefreshKey]);

  const getGroup = (id: string) => {
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].id.toString() === id) {
        return groups[i];
      }
    }
    return null;
  };

  const headerHeight = Platform.OS === "ios" ? 44 + insets.top : 56;

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerShadowVisible: false,
      }}
    >
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
            headerShown: true,
            headerTintColor: "#F3F4F6", // gray-100
            headerStyle: {
              backgroundColor: "#1F2937", // gray-800
              borderBottomWidth: 1,
              borderBottomColor: "#374151", // gray-700
              height: headerHeight,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              elevation: 4,
            },
            headerLeft: () => (
              <Pressable
                className="h-10 w-10 items-center justify-center mx-1 rounded-full"
                onPress={() => router.back()}
              >
                {({ pressed }) => (
                  <Ionicons
                    name="arrow-back"
                    size={22}
                    color={pressed ? "#9CA3AF" : "#F3F4F6"}
                  />
                )}
              </Pressable>
            ),
            headerRight: () => {
              if (group) {
                return (
                  <View className="justify-center items-center">
                    <Pressable
                      className="h-[40] w-[40] flex items-center justify-center"
                      onPress={() =>
                        router.push(
                          `/groups/chat-settings/${group.id.toString()}`
                        )
                      }
                    >
                      {({ pressed }) => (
                        <Ionicons
                          name={"ellipsis-horizontal-outline"}
                          size={20}
                          color={pressed ? "gray" : "white"}
                        />
                      )}
                    </Pressable>
                  </View>
                );
              }
              return null;
            },
            headerTitle: () => (
              <View className="flex-row items-center max-w-[220px]">
                {group && (
                  <>
                    <View className="w-8 h-8 rounded-full bg-blue-600 mr-2 overflow-hidden">
                      <GroupAvatarSmall
                        imageURL={group.image_url ?? null}
                        blurhash={group.blurhash ?? null}
                        name={group.name}
                      />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text
                        className="text-gray-100 text-base font-semibold"
                        numberOfLines={1}
                      >
                        {group.name}
                      </Text>
                      {group.group_users && (
                        <Text className="text-gray-400 text-xs">
                          {group.group_users.length}{" "}
                          {group.group_users.length === 1
                            ? "member"
                            : "members"}
                        </Text>
                      )}
                    </View>
                  </>
                )}
                {!group && (
                  <Text className="text-gray-100 text-base font-semibold">
                    Loading...
                  </Text>
                )}
              </View>
            ),
          };
        }}
      />
      <Stack.Screen
        name="chat-create"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="chat-settings/[id]"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="images/[uri]"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack>
  );
}
