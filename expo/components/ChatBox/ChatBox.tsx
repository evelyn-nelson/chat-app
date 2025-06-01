import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
import { Group, MessageUser, DbMessage } from "@/types/types";
import * as deviceService from "@/services/deviceService";
import * as encryptionService from "@/services/encryptionService";

const SCROLL_THRESHOLD = 200;
const HAPTIC_THRESHOLD = -40;

type BubbleItem = {
  id: string | null;
  user: MessageUser;
  text: string;
  align: "left" | "right";
  timestamp: string;
  type: "message" | "date-separator";
  dateString?: string;
};

const compareUint8Arrays = (
  a: Uint8Array | null,
  b: Uint8Array | null
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export default function ChatBox({ group }: { group: Group }) {
  const { user } = useGlobalStore();
  const { getMessagesForGroup } = useMessageStore();
  const groupMessages = useMemo(() => {
    return getMessagesForGroup(group.id);
  }, [getMessagesForGroup, group.id]);

  const flatListRef = useRef<FlatList<BubbleItem> | null>(null);
  const lastCountRef = useRef(groupMessages.length);
  const scrollHandle = useRef<number | null>(null);
  const hasInitiallyScrolled = useRef(false);

  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  const [isActivelySwipping, setIsActivelySwipping] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const swipeX = useSharedValue(0);
  const hapticTriggered = useSharedValue(false);

  const [devicePrivateKey, setDevicePrivateKey] = useState<Uint8Array | null>(
    null
  );
  const prevDevicePrivateKeyRef = useRef<Uint8Array | null>(null);

  const usersMapRef = useRef<Record<string, { id: string; username: string }>>(
    {}
  );

  useEffect(() => {
    const loadKey = async () => {
      try {
        const identity = await deviceService.ensureDeviceIdentity();
        setDevicePrivateKey(identity.privateKey);
      } catch (error) {
        console.error("ChatBox: Failed to load device private key:", error);
        setDevicePrivateKey(null);
      }
    };
    loadKey();
  }, []);

  const recipientUserIds = useMemo(() => {
    return group.group_users.map((gu) => gu.id);
  }, [group.group_users]);

  useEffect(() => {
    const newMap: Record<string, { id: string; username: string }> = {};
    if (user) {
      newMap[user.id] = {
        id: user.id,
        username: user.username,
      };
    }
    group.group_users.forEach((gu) => {
      newMap[gu.id] = { id: gu.id, username: gu.username };
    });
    usersMapRef.current = newMap;
  }, [group.group_users, user]);

  const [displayableMessages, setDisplayableMessages] = useState<BubbleItem[]>(
    []
  );
  const [decryptedContentCache, setDecryptedContentCache] = useState<
    Map<string, string | null>
  >(new Map());

  useEffect(() => {
    const decryptAndFormatMessages = async () => {
      // 1. Handle no private key (same as before)
      if (!devicePrivateKey) {
        if (
          displayableMessages.length > 0 ||
          prevDevicePrivateKeyRef.current !== null
        ) {
          setDisplayableMessages([]);
        }
        if (prevDevicePrivateKeyRef.current !== null) {
          setDecryptedContentCache(new Map());
        }
        prevDevicePrivateKeyRef.current = null;
        return;
      }

      const keyHasChanged = !compareUint8Arrays(
        prevDevicePrivateKeyRef.current,
        devicePrivateKey
      );

      // 2. Early exit for empty messages (same as before)
      if (groupMessages.length === 0) {
        if (displayableMessages.length > 0 || keyHasChanged) {
          setDisplayableMessages([]);
        }
        if (keyHasChanged) {
          setDecryptedContentCache(new Map());
        }
        prevDevicePrivateKeyRef.current = devicePrivateKey
          ? new Uint8Array(devicePrivateKey)
          : null;
        return;
      }

      let cacheForThisDecryptionPass: Map<string, string | null>;
      if (keyHasChanged) {
        cacheForThisDecryptionPass = new Map();
      } else {
        cacheForThisDecryptionPass = decryptedContentCache;
      }

      const newCacheEntriesFromThisRun = new Map<string, string | null>();
      let newItemsWereDecryptedInThisRun = false;

      const sortedMessagesNewestFirst = [...groupMessages].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const finalDisplayableItems: BubbleItem[] = [];

      for (let i = 0; i < sortedMessagesNewestFirst.length; i++) {
        const currentMsg = sortedMessagesNewestFirst[i];
        let plaintext: string | null = null;

        if (cacheForThisDecryptionPass.has(currentMsg.id)) {
          plaintext = cacheForThisDecryptionPass.get(currentMsg.id)!;
        } else {
          try {
            plaintext = await encryptionService.decryptStoredMessage(
              currentMsg,
              devicePrivateKey
            );
          } catch (e) {
            console.error(`Error decrypting message ID ${currentMsg.id}:`, e);
            plaintext = "[Decryption Error]";
          }
          newCacheEntriesFromThisRun.set(currentMsg.id, plaintext);
          newItemsWereDecryptedInThisRun = true;
        }

        const currentPlaintext = plaintext ?? "[Decryption Failed]";
        const senderInfo = usersMapRef.current[currentMsg.sender_id] || {
          id: currentMsg.sender_id,
          username: "Unknown User",
        };
        const messageUser: MessageUser = {
          id: senderInfo.id,
          username: senderInfo.username,
        };

        finalDisplayableItems.push({
          id: currentMsg.id,
          user: messageUser,
          text: currentPlaintext,
          align: currentMsg.sender_id === user?.id ? "right" : "left",
          timestamp: currentMsg.timestamp,
          type: "message",
        });

        const currentDate = new Date(currentMsg.timestamp);
        const currentDateString = currentDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const nextOlderMsgInArray = sortedMessagesNewestFirst[i + 1];

        if (!nextOlderMsgInArray) {
          finalDisplayableItems.push({
            id: null,
            user: messageUser,
            text: "",
            align: "left",
            timestamp: currentMsg.timestamp,
            type: "date-separator",
            dateString: currentDateString,
          });
        } else {
          const nextOlderMsgDate = new Date(nextOlderMsgInArray.timestamp);
          const nextOlderMsgDateString = nextOlderMsgDate.toLocaleDateString(
            "en-US",
            {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }
          );

          if (currentDateString !== nextOlderMsgDateString) {
            finalDisplayableItems.push({
              id: null,
              user: messageUser,
              text: "",
              align: "left",
              timestamp: currentMsg.timestamp,
              type: "date-separator",
              dateString: currentDateString,
            });
          }
        }
      }

      setDisplayableMessages(finalDisplayableItems);

      if (keyHasChanged) {
        setDecryptedContentCache(newCacheEntriesFromThisRun);
      } else if (newItemsWereDecryptedInThisRun) {
        setDecryptedContentCache(
          (prevGlobalCache) =>
            new Map([...prevGlobalCache, ...newCacheEntriesFromThisRun])
        );
      }
      prevDevicePrivateKeyRef.current = devicePrivateKey
        ? new Uint8Array(devicePrivateKey)
        : null;
    };

    decryptAndFormatMessages();
  }, [groupMessages, devicePrivateKey, user?.id]);

  const flatListProps = useMemo(
    () => ({
      inverted: true,
      keyboardDismissMode: "interactive" as const,
      keyboardShouldPersistTaps: "handled" as const,
      scrollEventThrottle: 16,
      showsVerticalScrollIndicator: false,
      initialNumToRender: 15,
      maxToRenderPerBatch: 8,
      windowSize: 10,
      removeClippedSubviews: Platform.OS === "android",
      updateCellsBatchingPeriod: 100,
    }),
    []
  );

  const contentContainerStyle = useMemo(
    () => ({
      flexGrow: 1,
      justifyContent: "flex-end" as const,
      paddingHorizontal: 10,
      paddingVertical: 10,
    }),
    []
  );

  const triggerHapticFeedback = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(setIsActivelySwipping)(true);
      hapticTriggered.value = false;
    })
    .onUpdate((event) => {
      const clampedX = Math.max(-80, Math.min(0, event.translationX));
      swipeX.value = clampedX;
      if (clampedX <= HAPTIC_THRESHOLD && !hapticTriggered.value) {
        hapticTriggered.value = true;
        runOnJS(triggerHapticFeedback)();
      }
    })
    .onEnd(() => {
      swipeX.value = withSpring(0, { damping: 15, stiffness: 150 });
      runOnJS(setIsActivelySwipping)(false);
      hapticTriggered.value = false;
    });

  const scrollToBottom = useCallback(
    (animated = true) => {
      if (scrollHandle.current) clearTimeout(scrollHandle.current);
      scrollHandle.current = setTimeout(
        () => {
          if (flatListRef.current && displayableMessages.length > 0) {
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
    [displayableMessages.length]
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
        ? `date-${item.timestamp}-${index}`
        : item.id?.toString() || `message-${item.timestamp}-${index}`,
    []
  );

  const renderDateSeparator = useCallback(
    (dateString: string | undefined, key: string) => (
      <View key={key} className="my-4 items-center">
        <View className="bg-gray-800 px-3 py-1 rounded-full">
          <Text className="text-gray-400 text-xs font-medium">
            {dateString}
          </Text>
        </View>
      </View>
    ),
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: BubbleItem; index: number }) => {
      if (item.type === "date-separator") {
        return renderDateSeparator(
          item.dateString,
          `date-${item.timestamp}-${index}`
        );
      }
      const prevMessage = displayableMessages[index + 1]; // For inverted list, prev chronological is next in array
      return (
        <ChatBubble
          prevUserId={
            prevMessage && prevMessage.type === "message"
              ? prevMessage.user.id
              : ""
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
    [displayableMessages, isActivelySwipping, swipeX, renderDateSeparator]
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
                data={displayableMessages}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                onScroll={handleScroll}
                contentContainerStyle={contentContainerStyle}
                onLayout={() => {
                  if (
                    !hasInitiallyScrolled.current &&
                    displayableMessages.length > 0
                  ) {
                    // scrollToBottom(false); // Optional: initial scroll without animation
                    hasInitiallyScrolled.current = true;
                  }
                }}
                {...flatListProps}
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
          <MessageEntry group={group} recipientUserIds={recipientUserIds} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
