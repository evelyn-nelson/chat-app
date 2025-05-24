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

    const formattedTime = React.useMemo(() => {
      const messageDate = new Date(timestamp);
      if (isNaN(messageDate.getTime())) {
        return "Invalid time";
      }

      const timeFormatOptions: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      };
      return messageDate.toLocaleTimeString(undefined, timeFormatOptions);
    }, [timestamp]);

    const timestampOpacity = useDerivedValue(() => {
      if (!showTimestamp || !swipeX) return 0;

      const swipeValue = Math.abs(swipeX.value);
      return interpolate(swipeValue, [20, 60], [0, 1], Extrapolation.CLAMP);
    });

    const messageAnimatedStyle = useAnimatedStyle(() => {
      if (!swipeX) return {};

      if (isOwn) {
        // Own messages move with the full swipe distance
        return {
          transform: [{ translateX: swipeX.value }],
        };
      } else {
        // Other users' messages move left slightly (about 25% of the swipe)
        const otherUserOffset = interpolate(
          swipeX.value,
          [-80, 0],
          [-20, 0],
          Extrapolation.CLAMP
        );
        return {
          transform: [{ translateX: otherUserOffset }],
        };
      }
    });

    const timestampAnimatedStyle = useAnimatedStyle(() => {
      return {
        opacity: timestampOpacity.value,
      };
    });

    return (
      <View className="mb-2 relative">
        <View className="flex-row items-end relative">
          <Animated.View
            style={[messageAnimatedStyle, { width: "100%" }]}
            className={`
              flex-row
              ${isOwn ? "justify-end pr-4" : "justify-start pl-4"}
            `}
          >
            <View
              className={`
                flex-col
                ${isOwn ? "items-end" : "items-start"}
                max-w-[80%]
                web:max-w-[60vw]
                md:web:max-w-[50vw]
              `}
            >
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
                  className={`text-base ${
                    isOwn ? "text-white" : "text-gray-200"
                  }`}
                >
                  {message}
                </Text>
              </View>
            </View>
          </Animated.View>

          {showTimestamp && (
            <Animated.View
              style={[
                timestampAnimatedStyle,
                {
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: [{ translateY: -8 }],
                  alignItems: "flex-end",
                },
              ]}
            >
              <Text className="text-xs text-gray-500">{formattedTime}</Text>
            </Animated.View>
          )}
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.prevUserId === nextProps.prevUserId &&
      prevProps.user.id === nextProps.user.id &&
      prevProps.user.username === nextProps.user.username &&
      prevProps.message === nextProps.message &&
      prevProps.align === nextProps.align &&
      prevProps.timestamp === nextProps.timestamp &&
      prevProps.showTimestamp === nextProps.showTimestamp
    );
  }
);

export default ChatBubble;
