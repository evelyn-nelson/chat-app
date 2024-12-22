import {
  View,
  Text,
  StyleSheet,
  Button,
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
import { useWebSocket } from "../context/WebSocketContext";
import { User, Message } from "@/types/types";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { useMessageStore } from "../context/MessageStoreContext";

export type BubbleProps = {
  message: Message;
  align: string;
};

const SCROLL_THRESHOLD = 200;

export default function ChatBox(props: { group_id: number }) {
  const { group_id } = props;
  const { user } = useGlobalStore();
  const { getMessagesForGroup, loading } = useMessageStore();

  const groupMessages = getMessagesForGroup(group_id);

  const lastMessageRef = useRef(groupMessages.length);

  const scrollViewRef = useRef<ScrollView>(null);
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const bubbles = useMemo(
    () =>
      groupMessages.map((message) => ({
        message,
        align: message.user.id === user?.id ? "right" : "left",
      })),
    [groupMessages, user?.id]
  );

  useEffect(() => {
    if (groupMessages.length > lastMessageRef.current) {
      if (isNearBottom) {
        console.log("here");
        scrollToBottom(true);
      } else {
        setHasNewMessages(true);
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
    lastMessageRef.current = groupMessages.length;
  }, [groupMessages.length, isNearBottom]);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    }, 100);
  };

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

  useEffect(() => {
    const keyboardWillShow =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const keyboardWillHide =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const keyboardWillShowListener = Keyboard.addListener(
      keyboardWillShow,
      (e) => {
        const height =
          (Platform.OS === "ios" ? e.endCoordinates.height : 360) + 80;
        setKeyboardHeight(height);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      keyboardWillHide,
      () => {
        if (user?.username) {
          setKeyboardHeight(0);
        }
      }
    );
    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, []);

  //   return (
  //     <View style={[styles.chatBox, { height: windowHeight }]}>
  //       <View
  //         style={[styles.scrollContainer, { paddingBottom: 75 + keyboardHeight }]}
  //       >
  //         <ScrollView
  //           contentContainerStyle={styles.scrollViewContent}
  //           ref={scrollViewRef}
  //         >
  //           {bubbles.map((bubble, index) => {
  //             return (
  //               <ChatBubble
  //                 key={index}
  //                 username={bubble.message.user.username}
  //                 message={bubble.message.content}
  //                 align={bubble.align}
  //               />
  //             );
  //           })}
  //         </ScrollView>
  //       </View>
  //       {!!user?.username && (
  //         <View
  //           style={[
  //             styles.messageEntryContainer,
  //             { paddingBottom: 25 + keyboardHeight },
  //           ]}
  //         >
  //           <MessageEntry group_id={group_id} />
  //         </View>
  //       )}
  //     </View>
  //   );
  // }
  return (
    <KeyboardAvoidingView
      style={[styles.container, { height: windowHeight }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.chatBox}>
        <View
          style={[
            styles.scrollContainer,
            {
              paddingBottom:
                Platform.OS === "android" ? keyboardHeight + 75 : 75,
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.scrollViewContent}
            ref={scrollViewRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
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
        <View
          style={[
            styles.messageEntryContainer,
            Platform.OS === "android" && { bottom: keyboardHeight },
          ]}
        >
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
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  scrollContainer: {
    flex: 1,
  },
  messageEntryContainer: {
    height: 60,
    position: "absolute",
    bottom: 0,
    width: "100%",
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
  loadingContainer: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1,
  },
});
