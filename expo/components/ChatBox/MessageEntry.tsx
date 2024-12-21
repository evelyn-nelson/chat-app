import { StyleSheet, TextInput, View } from "react-native";
import { useState } from "react";
import { useWebSocket } from "../context/WebSocketContext";
import { Message, RawMessage, User } from "@/types/types";
import { useGlobalState } from "../context/GlobalStateContext";

const MessageEntry = (props: { group_id: number }) => {
  const { group_id } = props;
  const { user } = useGlobalState();
  const [message, setMessage] = useState<RawMessage>({
    sender_id: user?.id ?? 0,
    content: "",
    group_id: group_id,
  });
  const { sendMessage, connected } = useWebSocket();

  const handleSubmit = () => {
    if (message.content && user) {
      if (connected) {
        try {
          sendMessage(`${JSON.stringify(message)}`);
        } catch (error) {
          console.error("Error sending message:", error);
        }
      }
      setMessage({ sender_id: user?.id, content: "", group_id: group_id });
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        onChangeText={(event) => {
          if (user) {
            setMessage({
              sender_id: user?.id,
              content: event,
              group_id: group_id,
            });
          }
        }}
        onSubmitEditing={() => {
          handleSubmit();
        }}
        value={message.content}
        blurOnSubmit={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    height: 40,
    width: "90%",
    margin: "auto",
    borderWidth: 1,
    padding: 10,
  },
  container: {
    padding: 10,
  },
});

export default MessageEntry;
