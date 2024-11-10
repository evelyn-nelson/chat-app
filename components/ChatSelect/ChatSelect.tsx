import { View, Text, StyleSheet, Button } from "react-native";
import { ChatSelectBox } from "./ChatSelectBox";
import { useWebSocket } from "../context/WebSocketContext";
import { useEffect, useState } from "react";
import { Group } from "@/types/types";
import { ChatCreate } from "./ChatCreate";
import { useGlobalState } from "../context/GlobalStateContext";
import { router } from "expo-router";

export const ChatSelect = () => {
  const { getGroups } = useWebSocket();
  const { user, groups, setGroups } = useGlobalState();

  const fetchGroups = async () => {
    const data = await getGroups();
    setGroups(data);
  };

  useEffect(() => {
    setTimeout(fetchGroups, 2000);
  });
  useEffect(() => {
    fetchGroups();
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
                user={user}
                group={{ name: group.name, id: group.id, admin: group.admin }}
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
