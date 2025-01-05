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
  return (
    <View style={styles.container}>
      {user ? (
        <View>
          <ChatCreate user={user} />
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
