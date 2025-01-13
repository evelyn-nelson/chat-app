import { View, Text, StyleSheet, Button } from "react-native";
import { ChatSelectBox } from "./ChatSelectBox";
import { useWebSocket } from "../context/WebSocketContext";
import { useEffect, useRef, useState } from "react";
import { ChatCreate } from "./ChatCreate";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { CanceledError } from "axios";

export const ChatSelect = () => {
  const { getGroups } = useWebSocket();
  const { store, user, groups, setGroups } = useGlobalStore();

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

  return (
    <View style={styles.container}>
      {user ? (
        <View>
          <ChatCreate user={user} />
          <Button onPress={fetchGroups} title={"Refresh"} />
          {groups.map((group, index) => {
            return (
              <ChatSelectBox
                key={index}
                group={{
                  ...group,
                }}
              />
            );
          })}
        </View>
      ) : (
        <View>
          <Text>Not logged in</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 50,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
});
