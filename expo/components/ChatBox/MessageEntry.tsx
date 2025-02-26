import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useState } from "react";
import { useWebSocket } from "../context/WebSocketContext";
import { Message, RawMessage, User } from "@/types/types";
import { useGlobalStore } from "../context/GlobalStoreContext";

const MessageEntry = (props: { group_id: number }) => {
  const { group_id } = props;
  const { user } = useGlobalStore();
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
    <View className="p-[10]">
      <ScrollView
        className="h-[40] w-[90%] m-auto border border-blue-200 p-[10]"
        scrollEnabled={false}
      >
        <TextInput
          className="text-blue-200"
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
          style={{ outline: "none" }}
          value={message.content}
          blurOnSubmit={false}
        />
      </ScrollView>
    </View>
  );
};

export default MessageEntry;
