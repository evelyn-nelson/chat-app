import { View, Text, StyleSheet, Button } from "react-native";
import { ChatSelectBox } from "./ChatSelectBox";
import { useWebSocket } from "../WebSocketContext";
import { useEffect, useState } from "react";
import { Room } from "@/types/types";
import { ChatCreate } from "./ChatCreate";

export const ChatSelect = () => {
  const { getRooms, createRoom } = useWebSocket();
  const [rooms, setRooms] = useState<Room[]>([]);
  const user = { username: "Evelyn" };

  const fetchRooms = async () => {
    const data = await getRooms();
    setRooms(data);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <View style={styles.container}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
});
