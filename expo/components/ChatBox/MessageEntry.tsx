import React, { useState } from "react";
import {
  Pressable,
  View,
  TextInput,
  ActivityIndicator,
  Text,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useWebSocket } from "../context/WebSocketContext";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { Group, RawMessage } from "@/types/types";
import { useSendMessage } from "@/hooks/useSendMessage";

const MessageEntry = ({
  group,
  recipientUserIds,
}: {
  group: Group;
  recipientUserIds: string[];
}) => {
  const { user } = useGlobalStore();
  const { sendMessage, isSending, sendError } = useSendMessage();

  const [textContent, setTextContent] = useState<string>("");

  const handleSubmit = async () => {
    const trimmedContent = textContent.trim();
    if (!trimmedContent || !user) {
      if (!trimmedContent && user) {
        setTextContent("");
      }
      return;
    }

    try {
      await sendMessage(trimmedContent, group.id, recipientUserIds);
      setTextContent("");
    } catch (error) {
      console.error("MessageEntry: Error sending message:", error);
    }
  };

  return (
    <View>
      <View className="flex-row items-center px-3 py-2">
        <View className="flex-1 flex-row items-center bg-gray-800 rounded-full border border-gray-700 px-4">
          <TextInput
            autoCorrect
            spellCheck
            keyboardType="default"
            className="flex-1 text-base text-gray-200 px-0 py-2 outline-0"
            style={{ height: 40 }}
            value={textContent}
            onChangeText={setTextContent}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            blurOnSubmit={false}
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
          />
          <Pressable
            onPress={handleSubmit}
            disabled={!textContent.trim() || isSending}
            className={`ml-2 p-2 rounded-full ${
              !textContent.trim() || isSending ? "bg-blue-600" : "bg-gray-700"
            }`}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={textContent.trim() ? "#FFFFFF" : "#9CA3AF"}
              />
            )}
          </Pressable>
        </View>
      </View>
      {sendError && (
        <Text
          style={{
            color: "red",
            paddingHorizontal: 15,
            paddingBottom: 5,
            fontSize: 12,
          }}
        >
          Error: {sendError}
        </Text>
      )}
    </View>
  );
};

export default MessageEntry;
