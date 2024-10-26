import ChatBox from "@/components/ChatBox/ChatBox";
import { useGlobalState } from "@/components/context/GlobalStateContext";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

const RoomPage = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, rooms } = useGlobalState();
  const getRoom = () => {
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].id === id) {
        return rooms[i];
      }
    }
  };
  const room = getRoom();
  if (!user) {
    return (
      <View style={styles.chatBoxContainer}>
        <Stack.Screen options={{ title: "Please log in" }} />
      </View>
    );
  }

  return (
    <View style={styles.chatBoxContainer}>
      <Stack.Screen options={{ title: room?.name ?? "Loading..." }} />
      {user && <ChatBox user={user} roomID={id} />}
    </View>
  );
};

export default RoomPage;

const styles = StyleSheet.create({
  chatBoxContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
