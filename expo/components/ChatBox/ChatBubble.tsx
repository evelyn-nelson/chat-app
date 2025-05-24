import React from "react";
import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  SharedValue,
  useDerivedValue,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import type { MessageUser } from "@/types/types";

export interface ChatBubbleProps {
  prevUserId: number;
  user: MessageUser;
  message: string;
  align: "left" | "right";
  timestamp: string;
  swipeX?: SharedValue<number>;
  showTimestamp?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = React.memo(
  ({
    prevUserId,
    user,
    message,
    align,
    timestamp,
    swipeX,
    showTimestamp = false,
  }) => {
    const isOwn = align === "right";

    // Determine if this is a long message (rough estimate)
    const isLongMessage = message.length > 50;

    // Each message calculates its own timestamp opacity based on the shared swipeX
    const timestampOpacity = useDerivedValue(() => {
      if (!showTimestamp || !swipeX) return 0;

      const swipeValue = Math.abs(swipeX.value);
      return interpolate(swipeValue, [20, 60], [0, 1], Extrapolation.CLAMP);
    });

    // Animated styles
    const messageAnimatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            translateX: isOwn && swipeX ? swipeX.value : 0,
          },
        ],
      };
    });

    const timestampAnimatedStyle = useAnimatedStyle(() => {
      return {
        opacity: timestampOpacity.value,
      };
    });

    const formatTimestamp = (
      isoString: string
    ): { dateString?: string; timeString: string } => {
      const messageDate = new Date(isoString);
      if (isNaN(messageDate.getTime())) {
        return { timeString: "Invalid time" };
      }
      const now = new Date();
      const diffInMilliseconds = now.getTime() - messageDate.getTime();
      const twentyFourHoursInMilliseconds = 24 * 60 * 60 * 1000;

      const timeFormatOptions: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      };
      const timeString = messageDate.toLocaleTimeString(
        undefined,
        timeFormatOptions
      );

      if (diffInMilliseconds > twentyFourHoursInMilliseconds) {
        const month = (messageDate.getMonth() + 1).toString();
        const day = messageDate.getDate().toString();
        const year = messageDate.getFullYear().toString().slice(-2);
        const dateString = `${month}/${day}/${year}`;
        return { dateString, timeString };
      } else {
        return { timeString };
      }
    };

    const formattedTimestamp = formatTimestamp(timestamp);

    return (
      <View className="mb-2 relative">
        {/* Message container: holds the animated part and the timestamp */}
        <View className="flex-row items-end relative">
          {/* Animated part: Username and Bubble slide together */}
          <Animated.View
            style={[messageAnimatedStyle, { width: "100%" }]}
            className={`
              flex-row
              ${isOwn ? "justify-end pr-4" : "justify-start pl-4"}
            `}
          >
            {/* Inner container for vertical stacking, alignment, AND MAX-WIDTH */}
            <View
              className={`
                flex-col
                ${isOwn ? "items-end" : "items-start"}
                max-w-[80%]
                web:max-w-[60vw]
                md:web:max-w-[50vw]
              `}
            >
              {/* Username - slides with the bubble */}
              {prevUserId !== user.id && (
                <Text
                  className={`
                    text-xs
                    mb-1
                    ${
                      isOwn
                        ? "text-blue-200 text-right"
                        : "text-gray-400 text-left"
                    }
                  `}
                >
                  {user.username}
                </Text>
              )}

              {/* Message bubble - width determined by content, constrained by parent */}
              <View
                className={`
                  px-4
                  py-2
                  rounded-2xl
                  ${
                    isOwn
                      ? "bg-blue-600 rounded-tr-none"
                      : "bg-gray-700 rounded-tl-none"
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
          </Animated.View>

          {/* Timestamp - positioned based on message length */}
          {showTimestamp && (
            <Animated.View
              style={[
                timestampAnimatedStyle,
                {
                  position: "absolute",
                  right: 8,
                  // For long messages, center vertically. For short messages, align to bottom
                  ...(isLongMessage
                    ? {
                        top: "50%",
                        transform: [{ translateY: -12 }], // Half the height of timestamp text
                      }
                    : {
                        bottom: 2,
                      }),
                  alignItems: "flex-end",
                },
              ]}
            >
              {formattedTimestamp.dateString && (
                <Text className="text-xs text-gray-500">
                  {formattedTimestamp.dateString}
                </Text>
              )}
              <Text className="text-xs text-gray-500">
                {formattedTimestamp.timeString}
              </Text>
            </Animated.View>
          )}
        </View>
      </View>
    );
  }
);

export default ChatBubble;
