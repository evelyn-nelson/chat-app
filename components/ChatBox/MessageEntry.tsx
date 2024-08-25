import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useState } from "react";
import { useWebSocket } from "../WebSocketContext";
import { Message, User } from "@/types/types";

const MessageEntry = (props: { user: User }) => {
  const [message, setMessage] = useState<Message>({
    user: props.user,
    msg: "",
  });
  const { sendMessage, connected } = useWebSocket();

  const handleSubmit = () => {
    if (message.msg) {
      if (connected) {
        sendMessage(`${JSON.stringify(message)}`);
      }
      setMessage({ user: { username: props.user.username }, msg: "" });
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        onChangeText={(event) => {
          setMessage({ user: { username: props.user.username }, msg: event });
        }}
        onSubmitEditing={handleSubmit}
        value={message.msg}
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
