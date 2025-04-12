import { Pressable, TextInput, View } from "react-native";
import { useState } from "react";
import { useWebSocket } from "../context/WebSocketContext";
import { RawMessage } from "@/types/types";
import { useGlobalStore } from "../context/GlobalStoreContext";
import Ionicons from "@expo/vector-icons/Ionicons";

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
    <View className="flex-row items-center px-3 py-2 h-full">
      <View className="flex-1 bg-gray-800 rounded-full border border-gray-700 flex-row items-center px-4 h-12">
        <TextInput
          className="flex-1 text-gray-200 text-base"
          onChangeText={(event) => {
            if (user) {
              setMessage({
                sender_id: user?.id,
                content: event,
                group_id: group_id,
              });
            }
          }}
          onSubmitEditing={handleSubmit}
          style={{
            outline: "none",
          }}
          value={message.content}
          blurOnSubmit={false}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          multiline={false}
          returnKeyType="send"
        />
        <Pressable
          onPress={handleSubmit}
          disabled={!message.content}
          className={`ml-2 p-2 rounded-full ${
            message.content ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          <Ionicons
            name="send"
            size={18}
            color={message.content ? "#FFFFFF" : "#9CA3AF"}
          />
        </Pressable>
      </View>
    </View>
  );
};

export default MessageEntry;
