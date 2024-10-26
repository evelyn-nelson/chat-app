import { View, Text, StyleSheet, Button } from "react-native";
import { ChatSelectBox } from "./ChatSelectBox";
import { useWebSocket } from "../context/WebSocketContext";
import { useEffect, useState } from "react";
import { Room } from "@/types/types";
import { ChatCreate } from "./ChatCreate";
import { useGlobalState } from "../context/GlobalStateContext";
import { router } from "expo-router";

export const ChatSelect = () => {
  const { getRooms } = useWebSocket();
  const { user, rooms, setRooms } = useGlobalState();

  const fetchRooms = async () => {
    const data = await getRooms();
    setRooms(data);
  };

  useEffect(() => {
    setTimeout(fetchRooms, 2000);
  });
  useEffect(() => {
    fetchRooms();
  }, []);
  return (
    <View style={styles.container}>
      {user ? (
        <View>
          <ChatCreate user={user} />
          <Button onPress={fetchRooms} title={"Refresh"} />
          {rooms.map((room, index) => {
            return (
              <ChatSelectBox
                key={index}
                user={user}
                room={{ name: room.name, id: room.id, admin: room.admin }}
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
