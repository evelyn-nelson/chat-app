import React, { useState } from "react";
import { Pressable, View, TextInput } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useWebSocket } from "../context/WebSocketContext";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { RawMessage } from "@/types/types";

const MessageEntry = ({ group_id }: { group_id: string }) => {
  const { user } = useGlobalStore();
  const { sendMessage, connected } = useWebSocket();

  const [message, setMessage] = useState<RawMessage>({
    sender_id: user?.id ?? "",
    content: "",
    group_id,
  });

  const handleSubmit = () => {
    const trimmed = message.content.trim();
    if (!trimmed || !user) {
      if (!trimmed && user) {
        setMessage({ sender_id: user.id, content: "", group_id });
      }
      return;
    }
    if (connected) {
      try {
        sendMessage(JSON.stringify({ ...message, content: trimmed }));
      } catch (err) {
        console.error("Error sending message:", err);
      }
    }
    setMessage({ sender_id: user.id, content: "", group_id });
  };

  return (
    <View className="flex-row items-center px-3 py-2">
      <View className="flex-1 flex-row items-center bg-gray-800 rounded-full border border-gray-700 px-4">
        <TextInput
          autoCorrect
          spellCheck
          keyboardType="default"
          className="flex-1 text-base text-gray-200 px-0 py-2 outline-0"
          style={{ height: 40 }}
          value={message.content}
          onChangeText={(text) => {
            if (user) {
              setMessage({ sender_id: user.id, content: text, group_id });
            }
          }}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          blurOnSubmit={false}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />
        <Pressable
          onPress={handleSubmit}
          disabled={!message.content.trim()}
          className={`ml-2 p-2 rounded-full ${
            message.content.trim() ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          <Ionicons
            name="send"
            size={18}
            color={message.content.trim() ? "#FFFFFF" : "#9CA3AF"}
          />
        </Pressable>
      </View>
    </View>
  );
};

export default MessageEntry;
