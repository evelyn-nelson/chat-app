import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from "react-native";
import { Link, Stack, useNavigation } from "expo-router";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import UsernameInput from "@/components/settings/UsernameInput";
import { useEffect, useRef, useState } from "react";
import ChatBox from "@/components/ChatBox/ChatBox";
import { User } from "@/types/types";
import { WebSocketProvider } from "@/components/WebSocketContext";

export default function Home() {
  const [user, setUser] = useState<User>({ username: "" });
  return (
    <WebSocketProvider>
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Home" }} />
        <UsernameInput passValueToParent={setUser} />
        <View style={styles.chatBoxContainer}>
          <ChatBox user={user} />
        </View>
      </View>
    </WebSocketProvider>
  );
}
const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -5,
    left: 0,
    position: "absolute",
  },
  container: {
    flex: 1,
  },
  chatBoxContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
