import { Button, StyleSheet, Text, View } from "react-native";
import React from "react";
import { useWebSocket } from "./context/WebSocketContext";
import { useAuthUtils } from "./context/AuthUtilsContext";
import { useMessageStore } from "./context/MessageStoreContext";

const ConnectionTesting = () => {
  const { establishConnection, disconnect } = useWebSocket();
  const { loadHistoricalMessages } = useMessageStore();
  const { logout } = useAuthUtils();
  return (
    <View style={styles.container}>
      <Button title={"Connect"} onPress={establishConnection} />
      <Button title={"Disconnect"} onPress={disconnect} />
      <Button title={"Log out"} onPress={logout} />
      <Button title={"Load messages"} onPress={loadHistoricalMessages} />
    </View>
  );
};

export default ConnectionTesting;

const styles = StyleSheet.create({
  container: {
    marginTop: 200,
  },
});
