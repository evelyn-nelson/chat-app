import { Pressable, View, TextInput } from "react-native";
import { useState } from "react";

import { useWebSocket } from "../context/WebSocketContext";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { RawMessage } from "@/types/types";
import Ionicons from "@expo/vector-icons/Ionicons";

const MessageEntry = (props: { group_id: number }) => {
  const { group_id } = props;
  const { user } = useGlobalStore();
  const { sendMessage, connected } = useWebSocket();

  const [message, setMessage] = useState<RawMessage>({
    sender_id: user?.id ?? 0,
    content: "",
    group_id,
  });
  const [inputHeight, setInputHeight] = useState(40);

  const handleSubmit = () => {
    if (!message.content || !user) return;
    if (connected) {
      try {
        sendMessage(JSON.stringify(message));
      } catch (err) {
        console.error("Error sending message:", err);
      }
    }
    setMessage({ sender_id: user.id, content: "", group_id });
    setInputHeight(40);
  };

  return (
    <View className="flex-row items-center px-3 py-2">
      <View className="flex-1 flex-row items-center bg-gray-800 rounded-full border border-gray-700 px-4">
        <TextInput
          autoCorrect={true}
          spellCheck={true}
          keyboardType="default"
          className="flex-1 text-base text-gray-200 px-0"
          multiline
          onContentSizeChange={(e) =>
            setInputHeight(Math.min(e.nativeEvent.contentSize.height, 120))
          }
          style={{
            height: Math.max(40, inputHeight),
            textAlignVertical: "center",
            outlineWidth: 0,
          }}
          onChangeText={(event) => {
            if (user) {
              setMessage({
                sender_id: user.id,
                content: event,
                group_id: group_id,
              });
            }
          }}
          value={message.content}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          blurOnSubmit={false}
          returnKeyType="default"
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
