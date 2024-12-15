import { Link, router, Stack } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import AuthMenu from "@/components/AuthMenu/AuthMenu";
import http from "@/util/custom-axios";
import { useGlobalState } from "@/components/context/GlobalStateContext";
import { useWebSocket } from "@/components/context/WebSocketContext";
import { useEffect } from "react";

export default function HomeScreen() {
  const { setUser } = useGlobalState();

  const { establishConnection } = useWebSocket();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Home" }} />
      <AuthMenu
        onSubmitAction={() => {
          http
            .get(`http://${process.env.EXPO_PUBLIC_HOST}/api/users/whoami`)
            .then((response) => {
              const { data } = response;
              setUser({
                ...data,
              });
            })
            .catch((error) => {
              console.error("error authenticating: ", error);
            });
          establishConnection();
          router.push({ pathname: "/groups" });
        }}
      />
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
