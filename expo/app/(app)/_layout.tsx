import { ActivityIndicator, View, Platform } from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Redirect, Tabs } from "expo-router";
import { useAuthUtils } from "@/components/context/AuthUtilsContext";
import { User } from "@/types/types";
import { useWebSocket } from "@/components/context/WebSocketContext";
import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import { CanceledError } from "axios";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMessageStore } from "@/components/context/MessageStoreContext";

const AppLayout = () => {
  const { whoami } = useAuthUtils();
  const { getGroups, getUsers } = useWebSocket();
  const {
    store,
    deviceId,
    refreshGroups,
    refreshUsers,
    loadRelevantDeviceKeys,
  } = useGlobalStore();
  const { loadHistoricalMessages } = useMessageStore();
  const [user, setUser] = useState<User | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        setIsLoading(true);
        const { user: loggedInUser } = await whoami();
        if (isMounted) {
          setUser(loggedInUser);
        }
      } catch (err) {
        console.error("Error during app initialization: ", err);
        if (isMounted) {
          setUser(undefined);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFetchingGroups = useRef(false);
  const fetchGroups = useCallback(async () => {
    if (isFetchingGroups.current || !user) return;
    isFetchingGroups.current = true;
    try {
      const data = await getGroups();
      await store.saveGroups(data);
      refreshGroups();
    } catch (error) {
      if (!(error instanceof CanceledError)) {
        console.error("Failed to fetch/store groups:", error);
        await store.loadGroups();
      }
    } finally {
      isFetchingGroups.current = false;
    }
  }, [user, getGroups, store, refreshGroups]);

  const isFetchingUsers = useRef(false);
  const fetchUsers = useCallback(async () => {
    if (isFetchingUsers.current || !user) return;
    isFetchingUsers.current = true;
    try {
      const data = await getUsers();
      await store.saveUsers(data);
      refreshUsers();
    } catch (error) {
      if (!(error instanceof CanceledError)) {
        console.error("Failed to fetch/store users:", error);
        await store.loadUsers();
      }
    } finally {
      isFetchingUsers.current = false;
    }
  }, [user, getUsers, store, refreshUsers]);

  const isFetchingDeviceKeys = useRef(false);
  const fetchDeviceKeys = useCallback(async () => {
    if (isFetchingDeviceKeys.current || !user) return;
    isFetchingDeviceKeys.current = true;
    try {
      await loadRelevantDeviceKeys();
    } catch (error) {
      if (!(error instanceof CanceledError)) {
        console.error(
          "AppLayout: Error explicitly calling fetchDeviceKeys:",
          error
        );
      }
    } finally {
      isFetchingDeviceKeys.current = false;
    }
  }, [user, loadRelevantDeviceKeys]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (user && deviceId) {
      fetchGroups();
      fetchUsers();
      loadHistoricalMessages();
      fetchDeviceKeys();

      const groupsIntervalId = setInterval(fetchGroups, 5000);
      const usersIntervalId = setInterval(fetchUsers, 5000);
      const messagesIntervalId = setInterval(loadHistoricalMessages, 5000);
      const deviceKeysIntervalId = setInterval(fetchDeviceKeys, 5000);

      return () => {
        clearInterval(groupsIntervalId);
        clearInterval(usersIntervalId);
        clearInterval(messagesIntervalId);
        clearInterval(deviceKeysIntervalId);
      };
    }
    return undefined;
  }, [
    user,
    deviceId,
    fetchGroups,
    fetchUsers,
    loadHistoricalMessages,
    fetchDeviceKeys,
  ]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <ActivityIndicator size="large" color="#60A5FA" />
      </View>
    );
  }

  if (!isLoading && !user) {
    return <Redirect href={"/(auth)"} />;
  }

  const bottomPadding =
    Platform.OS === "ios"
      ? Math.max(insets.bottom, 16)
      : Platform.OS === "android"
        ? 16
        : 20; // web

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1F2937", // gray-800
          borderTopColor: "#374151", // gray-700
          borderTopWidth: 1,
          height: 60 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: "#60A5FA", // blue-400
        tabBarInactiveTintColor: "#9CA3AF", // gray-400
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              size={22}
              name={focused ? "home" : "home-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          tabBarLabel: "Groups",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              size={22}
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default AppLayout;
