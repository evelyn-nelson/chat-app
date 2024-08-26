import { Room, User } from "@/types/types";
import { Button, View } from "react-native";
import { useWebSocket } from "../WebSocketContext";

export const ChatSelectBox = (props: { user: User; room: Room }) => {
  const { room, user } = props;
  const { joinRoom } = useWebSocket();
  return (
    <>
      <Button title={room.name} onPress={() => joinRoom(room.id, user)} />
    </>
  );
};
