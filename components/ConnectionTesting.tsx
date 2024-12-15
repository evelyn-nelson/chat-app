import { Button, StyleSheet, Text, View } from "react-native";
import React from "react";
import { useWebSocket } from "./context/WebSocketContext";

const ConnectionTesting = () => {
  const { establishConnection, disconnect } = useWebSocket();
  return (
    <View>
      <Button
        title={"Connect"}
        onPress={() => {
          establishConnection();
        }}
      />
      <Button
        title={"Disconnect"}
        onPress={() => {
          disconnect();
        }}
      />
    </View>
  );
};

export default ConnectionTesting;

const styles = StyleSheet.create({});
