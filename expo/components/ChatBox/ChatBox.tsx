import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  useWindowDimensions,
  Animated,
  Pressable,
} from "react-native";
import ChatBubble from "./ChatBubble";
import { useEffect, useMemo, useRef, useState } from "react";
import MessageEntry from "./MessageEntry";
import { Message } from "@/types/types";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { useMessageStore } from "../context/MessageStoreContext";

export type BubbleProps = {
  message: Message;
  align: string;
};

const SCROLL_THRESHOLD = 200;
const isIOS = Platform.OS === "ios";

export default function ChatBox(props: { group_id: number }) {
  const { group_id } = props;
  const { user } = useGlobalStore();
  const { getMessagesForGroup, loading } = useMessageStore();
  const { height: windowHeight } = useWindowDimensions();

  const groupMessages = getMessagesForGroup(group_id);
  const lastMessageRef = useRef(groupMessages.length);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [hideMessages, setHideMessages] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  const bubbles = useMemo(
    () =>
      groupMessages.map((message) => ({
        message,
        align: message.user.id === user?.id ? "right" : "left",
      })),
    [groupMessages, user?.id]
  );

  const scrollToBottom = (animated = true) => {
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    scrollTimeout.current = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }, 0);
  };

  useEffect(() => {
    scrollToBottom(false);
    setHideMessages(false);

    const keyboardWillShow = Keyboard.addListener(
      isIOS ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        scrollToBottom(true);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      isIOS ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        scrollToBottom(true);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (groupMessages.length > lastMessageRef.current) {
      if (isNearBottom) {
        scrollToBottom(true);
      } else {
        setHasNewMessages(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
      }
    }
    lastMessageRef.current = groupMessages.length;
  }, [groupMessages.length, isNearBottom]);

  const handleNewMessagePress = () => {
    setHasNewMessages(false);
    scrollToBottom(true);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom - SCROLL_THRESHOLD;

    setIsNearBottom(isCloseToBottom);
    if (isCloseToBottom) {
      setHasNewMessages(false);
      fadeAnim.setValue(0);
    }
  };

  const messageAreaHeight = windowHeight - (Platform.OS === "web" ? 75 : 155);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={isIOS ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View
        className="flex-1 w-full bg-blue-900 px-2 pt-2"
        style={{ height: windowHeight }}
      >
        <View
          className="flex-1 mb-[60px] pb-1 bg-blue-900 rounded-t-xl overflow-hidden"
          style={{
            height: messageAreaHeight,
            shadowColor: "black",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.75,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "flex-end",
              padding: 10,
            }}
            ref={scrollViewRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              if (isNearBottom) {
                scrollToBottom(false);
              }
            }}
            onLayout={() => {
              scrollToBottom(false);
            }}
          >
            {bubbles.map((bubble, index) => (
              <View
                key={`${bubble.message.id || index}`}
                style={hideMessages ? { display: "none" } : {}}
              >
                <ChatBubble
                  prevUserId={
                    index != 0 ? bubbles[index - 1].message.user.id : 0
                  }
                  user={bubble.message.user}
                  message={bubble.message.content}
                  align={bubble.align}
                />
              </View>
            ))}
          </ScrollView>
        </View>
        {hasNewMessages && (
          <Animated.View
            className="absolute bottom-20 self-center bg-blue-300 px-5 py-2.5 rounded-full shadow-md"
            style={{
              opacity: fadeAnim,
              shadowColor: "black",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Pressable onPress={handleNewMessagePress}>
              <Text className="text-blue-900 font-semibold">
                New messages ↓
              </Text>
            </Pressable>
          </Animated.View>
        )}
        <View
          className="h-[60px] absolute bottom-0 w-[100vw] pb-1 bg-blue-900"
          style={{
            shadowColor: "black",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <MessageEntry group_id={group_id} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
