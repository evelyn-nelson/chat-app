import React from "react";
import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  SharedValue,
  useDerivedValue,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import type { MessageUser, ImageMessageContent } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";

export interface ImageBubbleProps {
  prevUserId: string;
  user: MessageUser;
  content: ImageMessageContent;
  align: "left" | "right";
  timestamp: string;
  swipeX?: SharedValue<number>;
  showTimestamp?: boolean;
}

const ImageBubble: React.FC<ImageBubbleProps> = React.memo(
  ({
    prevUserId,
    user,
    content,
    align,
    timestamp,
    swipeX,
    showTimestamp = false,
  }) => {
    const isOwn = align === "right";
    const formattedTime = React.useMemo(() => {
      const messageDate = new Date(timestamp);
      return messageDate.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }, [timestamp]);

    const timestampOpacity = useDerivedValue(() => {
      if (!showTimestamp || !swipeX) return 0;
      const swipeValue = Math.abs(swipeX.value);
      return interpolate(swipeValue, [20, 60], [0, 1], Extrapolation.CLAMP);
    });

    const messageAnimatedStyle = useAnimatedStyle(() => {
      if (!swipeX) return {};
      if (isOwn) {
        return { transform: [{ translateX: swipeX.value }] };
      } else {
        const otherUserOffset = interpolate(
          swipeX.value,
          [-80, 0],
          [-20, 0],
          Extrapolation.CLAMP
        );
        return { transform: [{ translateX: otherUserOffset }] };
      }
    });

    const timestampAnimatedStyle = useAnimatedStyle(() => ({
      opacity: timestampOpacity.value,
    }));

    return (
      <View className="mb-2 relative">
        <View className="flex-row items-end relative">
          <Animated.View
            style={[messageAnimatedStyle, { width: "100%" }]}
            className={`flex-row ${
              isOwn ? "justify-end pr-4" : "justify-start pl-4"
            }`}
          >
            <View
              className={`flex-col ${
                isOwn ? "items-end" : "items-start"
              } max-w-[80%] web:max-w-[60vw] md:web:max-w-[50vw]`}
            >
              {prevUserId !== user.id && (
                <Text
                  className={`text-xs mb-1 ${
                    isOwn
                      ? "text-blue-200 text-right"
                      : "text-gray-400 text-left"
                  }`}
                >
                  {user.username}
                </Text>
              )}
              <View
                className={`
                  w-64 rounded-2xl overflow-hidden
                  ${
                    isOwn
                      ? "bg-blue-900/50 rounded-tr-none"
                      : "bg-gray-800/50 rounded-tl-none"
                  }
                `}
              >
                <View className="bg-black/20 aspect-video items-center justify-center">
                  <Ionicons name="image-outline" size={48} color="gray" />
                </View>
                <View className="p-2 border-t border-black/20">
                  <Text
                    className="text-white text-xs italic"
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {content.objectKey}
                  </Text>
                </View>
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
      prevProps.content.objectKey === nextProps.content.objectKey &&
      prevProps.align === nextProps.align &&
      prevProps.showTimestamp === nextProps.showTimestamp
    );
  }
);

export default ImageBubble;
