import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { Redirect, Stack, Tabs } from "expo-router";
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
  const { getGroups, disconnect } = useWebSocket();
  const { store, refreshGroups } = useGlobalStore();
  const { loadHistoricalMessages } = useMessageStore();
  const [user, setUser] = useState<User | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        setIsLoading(true);
        const loggedInUser = await whoami();
        if (isMounted) {
          setUser(loggedInUser);
          if (loggedInUser) {
            await fetchGroups();
            await loadHistoricalMessages();
          }
        }
      } catch (err) {
        console.error("Error loading data: ", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
      disconnect();
    };
  }, []);

  const isFetching = useRef(false);

  const fetchGroups = async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      const data = await getGroups();
      store.saveGroups(data);
      refreshGroups();
    } catch (error) {
      if (!(error instanceof CanceledError)) {
        try {
          await store.loadGroups();
        } catch (storeError) {
          console.error("Failed to load groups:", storeError);
        }
      }
    } finally {
      isFetching.current = false;
    }
  };

  useEffect(() => {
    fetchGroups();

    const groupIntervalId = setInterval(fetchGroups, 5000);
    const messagesIntervalId = setInterval(loadHistoricalMessages, 5000);

    return () => {
      clearInterval(groupIntervalId);
      clearInterval(messagesIntervalId);
    };
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <ActivityIndicator size="large" color="#60A5FA" />
      </View>
    );
  }

  if (!isLoading && !user) {
    return <Redirect href={"/signin"} />;
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
