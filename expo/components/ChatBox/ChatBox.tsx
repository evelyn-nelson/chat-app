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
import { useWebSocket } from "../context/WebSocketContext";
import { User, Message } from "@/types/types";
import { useGlobalState } from "../context/GlobalStateContext";

export type BubbleProps = {
  message: Message;
  align: string;
};

export default function ChatBox(props: { group_id: number }) {
  const { group_id } = props;
  const { user } = useGlobalState();
  const [bubbles, setBubbles] = useState<BubbleProps[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { height: windowHeight } = useWindowDimensions();
  const { onMessage, removeMessageHandler } = useWebSocket();
  const messageHandlerRef = useRef<(message: Message) => void>();

  useEffect(() => {
    const setupGroup = async () => {
      try {
        const handleNewMessage = (message: Message) => {
          if (message.group_id === group_id) {
            const align = message.user.id === user?.id ? "right" : "left";
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
          }
        };
        messageHandlerRef.current = handleNewMessage;
        onMessage(handleNewMessage);
      } catch (error) {
        console.error("Error joining group: ", error);
      }
    };
    console.log(messageHandlerRef);
    setupGroup();

    return () => {
      if (messageHandlerRef.current) {
        removeMessageHandler(messageHandlerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        if (user?.username) {
          setKeyboardHeight(360);
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }, 100);
        }
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        if (user?.username) {
          setKeyboardHeight(0);
        }
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [user?.username]);

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
                message={bubble.message.content}
                align={bubble.align}
              />
            );
          })}
        </ScrollView>
      </View>
      {!!user?.username && (
        <View
          style={[
            styles.messageEntryContainer,
            { paddingBottom: 25 + keyboardHeight },
          ]}
        >
          <MessageEntry group_id={group_id} />
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
