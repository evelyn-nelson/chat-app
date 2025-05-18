import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  useWindowDimensions,
  Animated,
  Pressable,
  InteractionManager,
} from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import ChatBubble from "./ChatBubble";
import MessageEntry from "./MessageEntry";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { useMessageStore } from "../context/MessageStoreContext";

const SCROLL_THRESHOLD = 200;

export default function ChatBox({ group_id }: { group_id: number }) {
  const { user } = useGlobalStore();
  const { getMessagesForGroup } = useMessageStore();
  const groupMessages = getMessagesForGroup(group_id);
  const { height: windowHeight } = useWindowDimensions();

  const scrollViewRef = useRef<ScrollView>(null);
  const lastCountRef = useRef(groupMessages.length);
  const scrollHandle = useRef<any>(null);

  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const bubbles = useMemo(
    () =>
      groupMessages.map((m) => ({
        id: m.id,
        user: m.user,
        text: m.content,
        align: m.user.id === user?.id ? "right" : "left",
      })),
    [groupMessages, user?.id]
  );

  const messageAreaHeight = windowHeight - (Platform.OS === "web" ? 75 : 155);

  const scrollToBottom = (animated = true) => {
    if (scrollHandle.current) {
      if (typeof scrollHandle.current.cancel === "function") {
        scrollHandle.current.cancel();
      } else {
        clearTimeout(scrollHandle.current);
      }
    }
    scrollHandle.current = InteractionManager.runAfterInteractions(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      });
    });
  };

  // on mount, hook up keyboard events
  useEffect(() => {
    // initial
    scrollToBottom(false);

    let willShowSub: any, didShowSub: any, didHideSub: any;

    if (Platform.OS === "ios") {
      // jump as soon as the keyboard **starts** to open
      willShowSub = Keyboard.addListener("keyboardWillShow", () => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      });
      // then lock in once it has fully opened
      didShowSub = Keyboard.addListener("keyboardDidShow", () => {
        scrollToBottom(true);
      });
    } else {
      // on Android just do both on DidShow
      didShowSub = Keyboard.addListener("keyboardDidShow", () => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        scrollToBottom(true);
      });
    }

    // always re-lock when it closes
    didHideSub = Keyboard.addListener("keyboardDidHide", () => {
      scrollToBottom(true);
    });

    return () => {
      willShowSub?.remove();
      didShowSub.remove();
      didHideSub.remove();
      if (scrollHandle.current) {
        if (typeof scrollHandle.current.cancel === "function") {
          scrollHandle.current.cancel();
        } else {
          clearTimeout(scrollHandle.current);
        }
      }
    };
  }, []);

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

  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const close =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - SCROLL_THRESHOLD;
    setIsNearBottom(close);
    if (close) {
      setHasNew(false);
      fadeAnim.setValue(0);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View
        className="flex-1 w-full bg-gray-900 px-2 pt-2"
        style={{ height: windowHeight }}
      >
        <View
          className="flex-1 mb-[60px] bg-gray-900 rounded-t-xl overflow-hidden"
          style={{ height: messageAreaHeight }}
        >
          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "flex-end",
              padding: 10,
            }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onLayout={() => scrollToBottom(false)}
            onContentSizeChange={() => {
              if (isNearBottom) scrollToBottom(false);
            }}
          >
            {bubbles.map((b, i) => (
              <ChatBubble
                key={b.id ?? i}
                prevUserId={i > 0 ? bubbles[i - 1].user.id : 0}
                user={b.user}
                message={b.text}
                align={b.align}
              />
            ))}
          </ScrollView>
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

        <View
          className="h-[60px] absolute bottom-0 w-full pb-1 bg-gray-900"
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
