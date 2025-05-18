import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  useWindowDimensions,
  Animated,
  Pressable,
  LayoutAnimation,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import ChatBubble from "./ChatBubble";
import MessageEntry from "./MessageEntry";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { useMessageStore } from "../context/MessageStoreContext";
import { Message } from "@/types/types";

const SCROLL_THRESHOLD = 200;

// Define a type for our bubble items
type BubbleItem = {
  id: number | null;
  user: any; // Replace with your actual user type
  text: string;
  align: "left" | "right";
};

export default function ChatBox({ group_id }: { group_id: number }) {
  const { user } = useGlobalStore();
  const { getMessagesForGroup } = useMessageStore();
  const groupMessages = getMessagesForGroup(group_id);
  const { height: windowHeight } = useWindowDimensions();

  const flatListRef = useRef<FlatList<BubbleItem> | null>(null);
  const lastCountRef = useRef(groupMessages.length);
  const scrollHandle = useRef<number | null>(null);

  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // prepare bubbles
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

  // Simplified scroll to end
  const scrollToBottom = (animated = true) => {
    if (scrollHandle.current) {
      clearTimeout(scrollHandle.current);
    }

    scrollHandle.current = setTimeout(() => {
      if (flatListRef.current && bubbles.length > 0) {
        flatListRef.current.scrollToIndex({
          index: 0,
          animated,
        });
      }
    }, 50);
  };

  useEffect(() => {
    // Configure iOS layout animations
    if (Platform.OS === "ios") {
      LayoutAnimation.configureNext({
        duration: 300,
        create: { type: "linear", property: "opacity" },
        update: { type: "spring", springDamping: 0.7 },
        delete: { type: "linear", property: "opacity" },
      });
    }

    // For iOS, use keyboardWillShow/Hide for smoother transitions
    const keyboardShowListener =
      Platform.OS === "ios"
        ? Keyboard.addListener("keyboardWillShow", (event) => {
            setKeyboardVisible(true);
            if (isNearBottom) {
              LayoutAnimation.configureNext({
                duration: event.duration || 250,
                update: { type: "keyboard" },
              });
            }
          })
        : Keyboard.addListener("keyboardDidShow", () => {
            setKeyboardVisible(true);
            if (isNearBottom) {
              // For Android, scroll after a small delay to ensure layout is updated
              setTimeout(() => scrollToBottom(true), 100);
            }
          });

    const keyboardHideListener =
      Platform.OS === "ios"
        ? Keyboard.addListener("keyboardWillHide", () => {
            setKeyboardVisible(false);
            if (isNearBottom) {
              LayoutAnimation.configureNext({
                duration: 250,
                update: { type: "keyboard" },
              });
            }
          })
        : Keyboard.addListener("keyboardDidHide", () => {
            setKeyboardVisible(false);
          });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
      if (scrollHandle.current) {
        clearTimeout(scrollHandle.current);
      }
    };
  }, [isNearBottom]);

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
  }, [groupMessages.length, isNearBottom]);

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
    // With FlatList, we're inverted so a low offset means near bottom
    const close = offset < SCROLL_THRESHOLD;

    if (close !== isNearBottom) {
      setIsNearBottom(close);
      if (close) {
        setHasNew(false);
        fadeAnim.setValue(0);
      }
    }
  };

  // This renders each chat bubble
  const renderItem = ({ item, index }: { item: BubbleItem; index: number }) => (
    <ChatBubble
      key={item.id ?? index}
      prevUserId={index < bubbles.length - 1 ? bubbles[index + 1].user.id : 0} // Note: index is inverted
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
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View className="flex-1 w-full bg-gray-900 px-2 pt-2">
        <View className="flex-1 mb-[60px] bg-gray-900 rounded-t-xl overflow-hidden">
          <FlatList
            ref={flatListRef}
            data={bubbles}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            inverted={true} // This is key for chat apps - newest messages at the bottom
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "flex-end",
              padding: 10,
              paddingBottom: keyboardVisible ? 20 : 10,
            }}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={21} // Affects performance and how many items are rendered
            onLayout={() => {
              if (isNearBottom && bubbles.length > 0) {
                scrollToBottom(false);
              }
            }}
            onContentSizeChange={() => {
              if (isNearBottom && bubbles.length > 0) {
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

        <View className="h-[60px] absolute bottom-0 w-full pb-1 bg-gray-900">
          <MessageEntry group_id={group_id} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
