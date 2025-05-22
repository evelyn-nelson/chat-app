import React from "react";
import { View, Text } from "react-native";
import type { MessageUser } from "@/types/types";

export interface ChatBubbleProps {
  prevUserId: number;
  user: MessageUser;
  message: string;
  align: "left" | "right";
}

const ChatBubble: React.FC<ChatBubbleProps> = React.memo(
  ({ prevUserId, user, message, align }) => {
    const isOwn = align === "right";

    return (
      <View
        className={`
          mb-2
          flex-col
          ${isOwn ? "items-end pr-4" : "items-start pl-4"}
        `}
      >
        {prevUserId !== user.id && (
          <Text
            className={`
              text-xs
              mb-1
              ${isOwn ? "text-blue-200 text-right" : "text-gray-400 text-left"}
            `}
          >
            {user.username}
          </Text>
        )}

        <View
          className={`
            px-4
            py-2
            rounded-2xl
            w-fit
            max-w-[80%]
            web:max-w-[60vw]
            md:web:max-w-[50vw]
            flex-shrink-0
            break-words
            ${
              isOwn
                ? "bg-blue-600 self-end rounded-tr-none"
                : "bg-gray-700 self-start rounded-tl-none"
            }
          `}
        >
          <Text
            selectable
            className={`text-base ${isOwn ? "text-white" : "text-gray-200"}`}
          >
            {message}
          </Text>
        </View>
      </View>
    );
  }
);

export default ChatBubble;
