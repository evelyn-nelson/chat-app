import { ChatSelect } from "@/components/ChatSelect/ChatSelect";
import { WebSocketProvider } from "@/components/WebSocketContext";
import { Link, Stack } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Home" }} />
      <ChatSelect />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
});
