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
  Animated, // This is for the "new messages" button only
} from "react-native";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ReanimatedAnimated, {
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import ChatBubble from "./ChatBubble";
import MessageEntry from "./MessageEntry";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { useMessageStore } from "../context/MessageStoreContext";
import { MessageUser } from "@/types/types";

const SCROLL_THRESHOLD = 200;

type BubbleItem = {
  id: number | null;
  user: MessageUser;
  text: string;
  align: "left" | "right";
  timestamp: string;
};

export default function ChatBox({ group_id }: { group_id: number }) {
  const { user } = useGlobalStore();
  const { getMessagesForGroup } = useMessageStore();
  const groupMessages = getMessagesForGroup(group_id);

  const flatListRef = useRef<FlatList<BubbleItem> | null>(null);
  const lastCountRef = useRef(groupMessages.length);
  const scrollHandle = useRef<number | null>(null);
  const hasInitiallyScrolled = useRef(false);

  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  const [isActivelySwipping, setIsActivelySwipping] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Single shared value for the swipe distance - all messages will use this
  const swipeX = useSharedValue(0);

  const bubbles = useMemo<BubbleItem[]>(
    () =>
      [...groupMessages].reverse().map((m) => ({
        id: m.id,
        user: m.user,
        text: m.content,
        align: m.user.id === user?.id ? "right" : "left",
        timestamp: m.timestamp,
      })),
    [groupMessages, user?.id]
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(setIsActivelySwipping)(true);
    })
    .onUpdate((event) => {
      // Only allow left swipes, clamp between -80 and 0
      const clampedX = Math.max(-80, Math.min(0, event.translationX));
      swipeX.value = clampedX;
    })
    .onEnd(() => {
      // Smooth spring back to 0
      swipeX.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });

      runOnJS(setIsActivelySwipping)(false);
    });

  const scrollToBottom = useCallback(
    (animated = true) => {
      if (scrollHandle.current) {
        clearTimeout(scrollHandle.current);
      }
      scrollHandle.current = setTimeout(
        () => {
          if (flatListRef.current && bubbles.length > 0) {
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
    [bubbles.length]
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

  const keyExtractor = (item: BubbleItem, index: number) =>
    item.id?.toString() || `message-${index}`;

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
                data={bubbles}
                renderItem={({
                  item,
                  index,
                }: {
                  item: BubbleItem;
                  index: number;
                }) => (
                  <ChatBubble
                    prevUserId={
                      index < bubbles.length - 1
                        ? bubbles[index + 1].user.id
                        : 0
                    }
                    user={item.user}
                    message={item.text}
                    align={item.align}
                    timestamp={item.timestamp}
                    swipeX={swipeX}
                    showTimestamp={isActivelySwipping}
                  />
                )}
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
                initialNumToRender={25}
                maxToRenderPerBatch={10}
                windowSize={21}
                onLayout={() => {
                  if (!hasInitiallyScrolled.current && bubbles.length > 0) {
                    hasInitiallyScrolled.current = true;
                    scrollToBottom(false);
                  }
                }}
                onContentSizeChange={() => {
                  if (
                    hasInitiallyScrolled.current &&
                    isNearBottom &&
                    bubbles.length > 0
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
