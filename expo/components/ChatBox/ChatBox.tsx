import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  // useWindowDimensions, // Not currently used
  Animated,
  Pressable,
  // LayoutAnimation, // Keep for potential item animations, but not for keyboard
  NativeSyntheticEvent,
  NativeScrollEvent,
  KeyboardEvent, // Import this if you have it defined, or use any
} from "react-native";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ChatBubble from "./ChatBubble";
import MessageEntry from "./MessageEntry";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { useMessageStore } from "../context/MessageStoreContext";
import { MessageUser } from "@/types/types"; // Assuming Message type is also here or not needed directly

const SCROLL_THRESHOLD = 200;

type BubbleItem = {
  id: number | null;
  user: MessageUser;
  text: string;
  align: "left" | "right";
};

// A more generic KeyboardEvent type if not importing a specific one
interface RNKeyboardEvent {
  endCoordinates: {
    screenX: number;
    screenY: number;
    width: number;
    height: number;
  };
  duration?: number;
  easing?: string;
  isEventFromThisApp?: boolean;
}

export default function ChatBox({ group_id }: { group_id: number }) {
  const { user } = useGlobalStore();
  const { getMessagesForGroup } = useMessageStore();
  const groupMessages = getMessagesForGroup(group_id);

  const flatListRef = useRef<FlatList<BubbleItem> | null>(null);
  const lastCountRef = useRef(groupMessages.length);
  const scrollHandle = useRef<number | null>(null);

  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false); // Track keyboard state
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const bubbles = useMemo<BubbleItem[]>(
    () =>
      [...groupMessages].reverse().map((m) => ({
        id: m.id,
        user: m.user,
        text: m.content,
        align: m.user.id === user?.id ? "right" : "left",
      })),
    [groupMessages, user?.id]
  );

  const scrollToBottom = useCallback(
    (animated = true) => {
      if (scrollHandle.current) {
        clearTimeout(scrollHandle.current);
      }
      // Increased delay slightly to give more time for layout to settle
      scrollHandle.current = setTimeout(
        () => {
          if (flatListRef.current && bubbles.length > 0) {
            flatListRef.current.scrollToIndex({
              index: 0,
              animated,
              viewPosition: 0, // For inverted, 0 index at viewPosition 0 should be bottom
            });
          }
        },
        Platform.OS === "ios" ? 70 : 100
      ); // Slightly longer delay
    },
    [bubbles.length]
  );

  useEffect(() => {
    const keyboardShowListenerEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const keyboardHideListenerEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const keyboardShowListener = Keyboard.addListener(
      keyboardShowListenerEvent,
      (event) => {
        setIsKeyboardVisible(true);
        if (isNearBottom) {
          // Use event.duration on iOS for smoother timing with KAV
          const rnEvent = event as RNKeyboardEvent; // Cast for type safety
          const delay =
            Platform.OS === "ios" && rnEvent.duration ? rnEvent.duration : 150; // Android or fallback

          // Schedule scroll to occur after KAV has likely finished its animation/adjustment
          setTimeout(() => {
            scrollToBottom(true);
          }, delay);
        }
      }
    );

    const keyboardHideListener = Keyboard.addListener(
      keyboardHideListenerEvent,
      () => {
        setIsKeyboardVisible(false);
        // Optional: if near bottom, ensure it's still scrolled correctly after keyboard hides
        // if (isNearBottom && bubbles.length > 0) {
        //   setTimeout(() => scrollToBottom(true), 50);
        // }
      }
    );

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
      if (scrollHandle.current) {
        clearTimeout(scrollHandle.current);
      }
    };
  }, [isNearBottom, scrollToBottom, bubbles.length]); // Added bubbles.length

  useEffect(() => {
    if (groupMessages.length > lastCountRef.current) {
      if (isNearBottom) {
        // When a new message arrives and we're at the bottom, scroll.
        // The keyboard listener will also handle scrolling if keyboard is open.
        // This ensures scroll even if keyboard isn't involved.
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
    setHasNew(false); // Set immediately to allow UI to update if needed
    scrollToBottom(true);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(); // No need to setHasNew(false) in callback if already set
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

  const renderItem = ({ item, index }: { item: BubbleItem; index: number }) => (
    <ChatBubble
      key={item.id ?? `bubble-${index}`}
      prevUserId={index < bubbles.length - 1 ? bubbles[index + 1].user.id : 0}
      user={item.user}
      message={item.text}
      align={item.align}
    />
  );

  const keyExtractor = (item: BubbleItem, index: number) =>
    item.id?.toString() || `message-${index}`;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} // CRITICAL: Ensure this is correct for your app
    >
      <View className="flex-1 w-full bg-gray-900 px-2 pt-2">
        <View className="flex-1 mb-[60px] bg-gray-900 rounded-t-xl overflow-hidden">
          <FlatList
            ref={flatListRef}
            data={bubbles}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            inverted
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{
              flexGrow: 1, // Important for short content to be at the bottom
              justifyContent: "flex-end", // Works with inverted to push to visual bottom
              paddingHorizontal: 10,
              paddingVertical: 10, // Static padding
            }}
            // STEP 2: Temporarily comment out maintainVisibleContentPosition
            // maintainVisibleContentPosition={{
            //   minIndexForVisible: 0,
            //   autoscrollToTopThreshold: 10, // Pixels from "top" (visual bottom for inverted)
            // }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15} // Or a number appropriate for your average screen
            maxToRenderPerBatch={10}
            windowSize={21}
            onLayout={() => {
              // Scroll on initial layout only if keyboard is not visible
              // and we are already determined to be "near bottom" (which is true initially)
              if (isNearBottom && bubbles.length > 0 && !isKeyboardVisible) {
                scrollToBottom(false); // Non-animated for initial setup
              }
            }}
            onContentSizeChange={() => {
              // Scroll on content size changes (e.g., initial messages load)
              // only if keyboard is not visible.
              if (isNearBottom && bubbles.length > 0 && !isKeyboardVisible) {
                scrollToBottom(false);
              }
            }}
          />
        </View>

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

        <View className="h-[60px] absolute bottom-0 left-0 right-0 bg-gray-900 px-2 pb-1">
          <MessageEntry group_id={group_id} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
