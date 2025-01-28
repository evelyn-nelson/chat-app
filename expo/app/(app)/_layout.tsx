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
  const { store, refreshGroups } = useGlobalStore();
  const [user, setUser] = useState<User | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

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
          }
        }
      } catch (err) {
        console.error(err);
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
          await store.loadGroups(); // this is just to test if store is working im thinking
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

    const intervalId = setInterval(fetchGroups, 5000);

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
