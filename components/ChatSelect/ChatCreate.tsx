import { Room, User } from "@/types/types";
import { Dispatch, SetStateAction, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useWebSocket } from "../WebSocketContext";

export const ChatCreate = (props: { user: User }) => {
  const [roomName, setRoomName] = useState<string>("");
  const { createRoom } = useWebSocket();
  const { user } = props;

  return (
    <View>
      <Text style={styles.header}>Create Room</Text>
      <TextInput
        style={styles.input}
        onChangeText={(event) => {
          setRoomName(event);
          console.log(roomName);
        }}
        onSubmitEditing={() => {
          createRoom(roomName, user);
        }}
        onKeyPress={(event) => {
          if (event.nativeEvent.key === "Enter") {
            createRoom(roomName, user);
          }
        }}
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
