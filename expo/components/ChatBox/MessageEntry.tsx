import {
  Pressable,
  View,
  TextInput,
  Platform,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import { useState } from "react";

import { useWebSocket } from "../context/WebSocketContext";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { RawMessage } from "@/types/types";
import Ionicons from "@expo/vector-icons/Ionicons";

interface WebTextInputKeyPressEventData extends TextInputKeyPressEventData {
  shiftKey?: boolean;
}

const MessageEntry = (props: { group_id: number }) => {
  const { group_id } = props;
  const { user } = useGlobalStore();
  const { sendMessage, connected } = useWebSocket();

  const [message, setMessage] = useState<RawMessage>({
    sender_id: user?.id ?? 0,
    content: "",
    group_id,
  });

  const handleSubmit = () => {
    const trimmedContent = message.content.trim();
    if (!trimmedContent || !user) {
      if (!trimmedContent && user) {
        setMessage({ sender_id: user.id, content: "", group_id });
      }
      return;
    }
    if (connected) {
      try {
        sendMessage(JSON.stringify({ ...message, content: trimmedContent }));
      } catch (err) {
        console.error("Error sending message:", err);
      }
    }

    setMessage({ sender_id: user.id, content: "", group_id });
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    if (Platform.OS === "web") {
      const webEvent = e.nativeEvent as WebTextInputKeyPressEventData;
      if (webEvent.key === "Enter" && !webEvent.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  return (
    <View className="flex-row items-center px-3 py-2">
      <View className="flex-1 flex-row items-center bg-gray-800 rounded-full border border-gray-700 px-4">
        <TextInput
          autoCorrect={true}
          spellCheck={true}
          keyboardType="default"
          className={`
            flex-1 text-base text-gray-200 px-0
            min-h-[40px] py-2
            ${Platform.OS === "android" ? "py-2" : "py-2.5"}
            ${Platform.OS === "web" ? "outline-0" : ""}
          `}
          style={{ height: 40 }}
          onChangeText={(text) => {
            if (user) {
              setMessage({
                sender_id: user.id,
                content: text,
                group_id: group_id,
              });
            }
          }}
          value={message.content}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          multiline
          blurOnSubmit={false}
          returnKeyType={Platform.OS === "ios" ? "send" : "default"}
          onSubmitEditing={Platform.OS !== "web" ? handleSubmit : undefined}
          onKeyPress={handleKeyPress}
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
