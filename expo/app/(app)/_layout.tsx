import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { Redirect, Stack, Tabs } from "expo-router";
import { useAuthUtils } from "@/components/context/AuthUtilsContext";
import { User } from "@/types/types";

const AppLayout = () => {
  const { whoami } = useAuthUtils();
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
