import { Room, User } from "@/types/types";
import { Button, Pressable, View, Text } from "react-native";
import { useWebSocket } from "../WebSocketContext";
import { router } from "expo-router";

export const ChatSelectBox = (props: { user: User; room: Room }) => {
  const { room, user } = props;
  const { joinRoom } = useWebSocket();
  return (
    <View>
      <Pressable
        onPress={() =>
          router.push({ pathname: "/rooms/[id]", params: { id: room.id } })
        }
      >
        <Text>{room.name}</Text>
      </Pressable>
    </View>
  );
};
