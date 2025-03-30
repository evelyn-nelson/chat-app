import { MessageUser } from "@/types/types";
import { Text, View } from "react-native";

const ChatBubble = (props: {
  prevUserId: number;
  user: MessageUser;
  message: string;
  align: string;
}) => {
  const { align, user, prevUserId, message } = props;
  const isOwnMessage = align === "right";

  return (
    <View
      className={`py-1 ${
        isOwnMessage ? "ml-auto mr-2 items-end" : "ml-2 items-start"
      }`}
    >
      {prevUserId != user.id && (
        <Text
          className={`text-xs mb-1 ${
            isOwnMessage
              ? "text-blue-400 text-right mr-2"
              : "text-gray-400 ml-2"
          }`}
        >
          {user.username}
        </Text>
      )}
      <View
        className={`rounded-2xl px-3 py-2 max-w-[80%] ${
          isOwnMessage
            ? "bg-blue-600 rounded-tr-none"
            : "bg-gray-700 rounded-tl-none"
        }`}
        style={{ alignSelf: isOwnMessage ? "flex-end" : "flex-start" }}
      >
        <Text
          selectable={true}
          className={`text-base ${
            isOwnMessage ? "text-white" : "text-gray-200"
          }`}
        >
          {message}
        </Text>
      </View>
    </View>
  );
};

export default ChatBubble;
