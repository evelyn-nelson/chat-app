import { Room, User } from "@/types/types";
import { Dispatch, SetStateAction, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useWebSocket } from "../context/WebSocketContext";
import { router } from "expo-router";

export const ChatCreate = (props: { user: User }) => {
  const [roomName, setRoomName] = useState<string>("");
  const { createRoom } = useWebSocket();
  const { user } = props;

  return (
    <View>
      <TextInput
        style={styles.input}
        onChangeText={(event) => {
          setRoomName(event);
        }}
        onSubmitEditing={async () => {
          const room = await createRoom(roomName, user);
          setRoomName("");
          if (room) {
            router.push({ pathname: "/room/[id]", params: { id: room.id } });
          }
        }}
        value={roomName}
        placeholder="Create new chat room"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    height: 40,
    width: 300,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
  header: {
    marginLeft: 12,
  },
});
