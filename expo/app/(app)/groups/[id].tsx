import ChatBox from "@/components/ChatBox/ChatBox";
import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import { Redirect, router, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

const GroupPage = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, groups } = useGlobalStore();
  if (!user) {
    return <Redirect href={"/signin"} />;
  }
  return (
    <View style={styles.chatBoxContainer}>
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
