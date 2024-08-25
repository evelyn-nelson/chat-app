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
} from "react-native";
import ChatBubble from "./ChatBubble";
import { useEffect, useRef, useState } from "react";
import MessageEntry from "./MessageEntry";
import { WebSocketProvider, useWebSocket } from "../WebSocketContext";
import { User, Message } from "@/types/types";

export type BubbleProps = {
  message: Message;
  align: string;
};

export default function ChatBox(props: { user: User }) {
  const [bubbles, setBubbles] = useState<BubbleProps[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { height: windowHeight } = useWindowDimensions();
  const { onMessage, removeMessageHandler } = useWebSocket();
  const messageHandlerRef = useRef<(message: Message) => void>();

  useEffect(() => {
    console.log(onMessage)
    console.log(removeMessageHandler)
    console.log(props.user.username)
    const handleNewMessage = (message: Message) => {
      const align =
        message.user.username === props.user.username ? "right" : "left";
      setBubbles((prevBubbles) => [
        ...prevBubbles,
        {
          message,
          align: align,
        },
      ]);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    messageHandlerRef.current = handleNewMessage;

    onMessage(handleNewMessage);

    return () => {
      if (messageHandlerRef.current) {
        removeMessageHandler(messageHandlerRef.current);
      }
    };
  }, [onMessage, removeMessageHandler, props.user.username]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        if (props.user.username) {
          setKeyboardHeight(360);
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }, 100);
        }
      },
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        if (props.user.username) {
          setKeyboardHeight(0);
        }
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [props.user.username]);

  return (
    <View style={[styles.chatBox, { height: windowHeight }]}>
      <View
        style={[styles.scrollContainer, { paddingBottom: 75 + keyboardHeight }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          ref={scrollViewRef}
        >
          {bubbles.map((bubble, index) => {
            return (
              <ChatBubble
                key={index}
                username={bubble.message.user.username}
                message={bubble.message.msg}
                align={bubble.align}
              />
            );
          })}
        </ScrollView>
      </View>
      {!!props.user.username && (
        <View
          style={[
            styles.messageEntryContainer,
            { paddingBottom: 25 + keyboardHeight },
          ]}
        >
          <MessageEntry user={props.user} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
