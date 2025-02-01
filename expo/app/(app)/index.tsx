import { Link, router, Stack } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import AuthMenu from "@/components/AuthMenu/AuthMenu";
import http from "@/util/custom-axios";
import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import { useWebSocket } from "@/components/context/WebSocketContext";
import { useEffect } from "react";
import { useAuthUtils } from "@/components/context/AuthUtilsContext";
import ConnectionTesting from "@/components/ConnectionTesting";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ConnectionTesting />
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
