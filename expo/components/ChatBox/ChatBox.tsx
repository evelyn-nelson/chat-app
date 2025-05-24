import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
} from "react-native";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ReanimatedAnimated, {
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import ChatBubble from "./ChatBubble";
import MessageEntry from "./MessageEntry";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { useMessageStore } from "../context/MessageStoreContext";
import { MessageUser } from "@/types/types";

const SCROLL_THRESHOLD = 200;
const HAPTIC_THRESHOLD = -40;

type BubbleItem = {
  id: number | null;
  user: MessageUser;
  text: string;
  align: "left" | "right";
  timestamp: string;
  type: "message" | "date-separator";
  dateString?: string;
};

export default function ChatBox({ group_id }: { group_id: number }) {
  const { user } = useGlobalStore();
  const { getMessagesForGroup } = useMessageStore();
  const groupMessages = getMessagesForGroup(group_id);

  const flatListRef = useRef<FlatList<BubbleItem> | null>(null);
  const lastCountRef = useRef(groupMessages.length);
  const scrollHandle = useRef<number | null>(null);
  const hasInitiallyScrolled = useRef(false);
  const hapticTriggered = useRef(false);

  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  const [isActivelySwipping, setIsActivelySwipping] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const swipeX = useSharedValue(0);

  // Group messages by date and create date separators
  const bubblesWithDates = useMemo<BubbleItem[]>(() => {
    const reversedMessages = [...groupMessages].reverse();
    const result: BubbleItem[] = [];
    let currentDate = "";

    reversedMessages.forEach((m, index) => {
      const messageDate = new Date(m.timestamp);
      const dateString = messageDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Add the message first
      result.push({
        id: m.id,
        user: m.user,
        text: m.content,
        align: m.user.id === user?.id ? "right" : "left",
        timestamp: m.timestamp,
        type: "message",
      });

      // Check if the NEXT message (or end of array) has a different date
      // If so, add a date separator AFTER this message
      const nextMessage = reversedMessages[index + 1];
      let shouldAddSeparator = false;

      if (!nextMessage) {
        // This is the last (oldest) message, always add a date separator
        shouldAddSeparator = true;
      } else {
        const nextMessageDate = new Date(nextMessage.timestamp);
        const nextDateString = nextMessageDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        shouldAddSeparator = dateString !== nextDateString;
      }

      if (shouldAddSeparator) {
        result.push({
          id: null,
          user: m.user,
          text: "",
          align: "left",
          timestamp: m.timestamp,
          type: "date-separator",
          dateString,
        });
      }
    });

    return result;
  }, [groupMessages, user?.id]);

  const triggerHapticFeedback = useCallback(() => {
    if (!hapticTriggered.current) {
      hapticTriggered.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(setIsActivelySwipping)(true);
      hapticTriggered.current = false;
    })
    .onUpdate((event) => {
      const clampedX = Math.max(-80, Math.min(0, event.translationX));
      swipeX.value = clampedX;

      if (clampedX <= HAPTIC_THRESHOLD && !hapticTriggered.current) {
        runOnJS(triggerHapticFeedback)();
      }
    })
    .onEnd(() => {
      swipeX.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });

      runOnJS(setIsActivelySwipping)(false);
      hapticTriggered.current = false;
    });

  const scrollToBottom = useCallback(
    (animated = true) => {
      if (scrollHandle.current) {
        clearTimeout(scrollHandle.current);
      }
      scrollHandle.current = setTimeout(
        () => {
          if (flatListRef.current && bubblesWithDates.length > 0) {
            flatListRef.current.scrollToIndex({
              index: 0,
              animated,
              viewPosition: 0,
            });
          }
        },
        Platform.OS === "ios" ? 70 : 100
      );
    },
    [bubblesWithDates.length]
  );

  useEffect(() => {
    if (groupMessages.length > lastCountRef.current) {
      if (isNearBottom) {
        scrollToBottom(true);
      } else {
        setHasNew(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
      }
    }
    lastCountRef.current = groupMessages.length;
  }, [groupMessages.length, isNearBottom, scrollToBottom, fadeAnim]);

  const handleNewPress = () => {
    setHasNew(false);
    scrollToBottom(true);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.y;
    const close = offset < SCROLL_THRESHOLD;

    if (close !== isNearBottom) {
      setIsNearBottom(close);
      if (close) {
        setHasNew(false);
        fadeAnim.setValue(0);
      }
    }
  };

  const keyExtractor = useCallback(
    (item: BubbleItem, index: number) =>
      item.type === "date-separator"
        ? `date-${index}`
        : item.id?.toString() || `message-${index}`,
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: BubbleItem; index: number }) => {
      if (item.type === "date-separator") {
        return (
          <View className="my-4 items-center">
            <View className="bg-gray-800 px-3 py-1 rounded-full">
              <Text className="text-gray-400 text-xs font-medium">
                {item.dateString}
              </Text>
            </View>
          </View>
        );
      }

      return (
        <ChatBubble
          prevUserId={
            index < bubblesWithDates.length - 1 &&
            bubblesWithDates[index + 1].type === "message"
              ? bubblesWithDates[index + 1].user.id
              : 0
          }
          user={item.user}
          message={item.text}
          align={item.align}
          timestamp={item.timestamp}
          swipeX={swipeX}
          showTimestamp={isActivelySwipping}
        />
      );
    },
    [bubblesWithDates, isActivelySwipping, swipeX]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View className="flex-1 w-full bg-gray-900 px-2 pt-2">
        <GestureHandlerRootView style={{ flex: 1 }}>
          <GestureDetector gesture={panGesture}>
            <ReanimatedAnimated.View className="flex-1 mb-[60px] bg-gray-900 rounded-t-xl overflow-hidden relative">
              <FlatList
                ref={flatListRef}
                data={bubblesWithDates}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                inverted
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "flex-end",
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                }}
                showsVerticalScrollIndicator={false}
                initialNumToRender={20}
                maxToRenderPerBatch={10}
                windowSize={15}
                removeClippedSubviews={true}
                onLayout={() => {
                  if (
                    !hasInitiallyScrolled.current &&
                    bubblesWithDates.length > 0
                  ) {
                    hasInitiallyScrolled.current = true;
                    scrollToBottom(false);
                  }
                }}
                onContentSizeChange={() => {
                  if (
                    hasInitiallyScrolled.current &&
                    isNearBottom &&
                    bubblesWithDates.length > 0
                  ) {
                    scrollToBottom(false);
                  }
                }}
              />
            </ReanimatedAnimated.View>
          </GestureDetector>
        </GestureHandlerRootView>

        {hasNew && (
          <Animated.View
            className="absolute bottom-20 self-center bg-blue-600 px-5 py-2.5 rounded-full"
            style={{
              opacity: fadeAnim,
              shadowColor: "black",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Pressable onPress={handleNewPress}>
              <Text className="text-white font-semibold">New messages ↓</Text>
            </Pressable>
          </Animated.View>
        )}

        <View className="h-[60px] absolute bottom-0 left-0 right-0 bg-gray-900 px-2 pb-1 my-2">
          <MessageEntry group_id={group_id} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
