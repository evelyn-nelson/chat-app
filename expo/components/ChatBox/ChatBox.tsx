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
    }, 50);
  };

  useEffect(() => {
    scrollToBottom(false);

    const keyboardWillShow = Keyboard.addListener(
      isIOS ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        scrollToBottom(true);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      isIOS ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        if (isNearBottom) {
          scrollToBottom(true);
        }
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
      style={styles.container}
      behavior={isIOS ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.chatBox, { height: windowHeight }]}>
        <View style={[styles.scrollContainer, { height: messageAreaHeight }]}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
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
              <ChatBubble
                key={`${bubble.message.id || index}`}
                username={bubble.message.user.username}
                message={bubble.message.content}
                align={bubble.align}
              />
            ))}
          </ScrollView>
        </View>
        {hasNewMessages && (
          <Animated.View
            style={[styles.newMessageIndicator, { opacity: fadeAnim }]}
          >
            <Pressable onPress={handleNewMessagePress}>
              <Text style={styles.newMessageText}>New messages ↓</Text>
            </Pressable>
          </Animated.View>
        )}
        <View style={styles.messageEntryContainer}>
          <MessageEntry group_id={group_id} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatBox: {
    flex: 1,
    width: "100%",
    borderTopWidth: 5,
    borderColor: "#353636",
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  scrollContainer: {
    flex: 1,
    marginBottom: 60,
  },
  messageEntryContainer: {
    height: 60,
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
  },
  newMessageIndicator: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  newMessageText: {
    color: "white",
    fontWeight: "600",
  },
});
