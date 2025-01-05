import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { Redirect, Stack, Tabs } from "expo-router";
import { useAuthUtils } from "@/components/context/AuthUtilsContext";
import { User } from "@/types/types";
import { useWebSocket } from "@/components/context/WebSocketContext";
import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import { CanceledError } from "axios";

const AppLayout = () => {
  const { whoami } = useAuthUtils();
  const { getGroups } = useWebSocket();
  const { store, setGroups } = useGlobalStore();
  const [user, setUser] = useState<User | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const fetchUser = async () => {
      try {
        if (isMounted.current) {
          const loggedInUser = await whoami();
          setUser(loggedInUser);
          setIsLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };
    fetchUser();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const isFetching = useRef(false);

  const fetchGroups = async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      const data = await getGroups();
      setGroups(data);
      store.saveGroups(data);
    } catch (error) {
      if (!(error instanceof CanceledError)) {
        try {
          const storedGroups = await store.loadGroups();
          setGroups(storedGroups);
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

    const intervalId = setInterval(fetchGroups, 20000);

    return () => clearInterval(intervalId);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isLoading && !user) {
    return <Redirect href={"/signin"} />;
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          tabBarLabel: "Groups",
        }}
      />
    </Tabs>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default AppLayout;
