import ChatBox from "@/components/ChatBox/ChatBox";
import { useGlobalState } from "@/components/context/GlobalStateContext";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

const GroupPage = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, groups } = useGlobalState();
  const getGroup = () => {
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].id.toString() === id) {
        return groups[i];
      }
    }
  };
  const group = getGroup();
  if (!user) {
    return (
      <View style={styles.chatBoxContainer}>
        <Stack.Screen options={{ title: "Please log in" }} />
      </View>
    );
  }
  return (
    <View style={styles.chatBoxContainer}>
      <Stack.Screen options={{ title: group?.name ?? "Loading..." }} />
      {user && <ChatBox group_id={Number(id)} />}
    </View>
  );
};

export default GroupPage;

const styles = StyleSheet.create({
  chatBoxContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
