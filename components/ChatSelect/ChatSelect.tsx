import { View, Text, StyleSheet, Button } from "react-native";
import { ChatSelectBox } from "./ChatSelectBox";
import { useWebSocket } from "../context/WebSocketContext";
import { useEffect, useRef, useState } from "react";
import { ChatCreate } from "./ChatCreate";
import { useGlobalState } from "../context/GlobalStateContext";

export const ChatSelect = () => {
  const { getGroups } = useWebSocket();
  const { user, groups, setGroups } = useGlobalState();

  const isFetching = useRef(false);

  const fetchGroups = async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      const data = await getGroups();
      setGroups(data);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    } finally {
      isFetching.current = false;
    }
  };

  useEffect(() => {
    fetchGroups();

    const intervalId = setInterval(fetchGroups, 5000);

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
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
});
