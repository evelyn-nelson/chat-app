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
import { Group, MessageUser } from "@/types/types";
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

export default function ChatBox({ group }: { group: Group }) {
  const { user } = useGlobalStore();
  const { getMessagesForGroup } = useMessageStore();
  const groupMessages = getMessagesForGroup(group.id);

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
  const prevPrivateKeyRef = useRef<Uint8Array | null>(null);

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
    if (!devicePrivateKey) {
      setDisplayableMessages([]);
      if (prevPrivateKeyRef.current !== null) {
        console.log("Private key removed, clearing decryption cache.");
        setDecryptedContentCache(new Map());
      }
      prevPrivateKeyRef.current = null;
      return;
    }

    let keyChanged = false;
    if (prevPrivateKeyRef.current === null && devicePrivateKey !== null) {
      keyChanged = true;
    } else if (
      prevPrivateKeyRef.current !== null &&
      devicePrivateKey === null
    ) {
      keyChanged = true;
    } else if (
      prevPrivateKeyRef.current &&
      devicePrivateKey &&
      !prevPrivateKeyRef.current.every(
        (val, index) => val === devicePrivateKey[index]
      )
    ) {
      keyChanged = true;
    }
    if (keyChanged) {
      console.log(
        "Device private key changed or initialized, clearing decryption cache."
      );
      setDecryptedContentCache(new Map());
    }
    prevPrivateKeyRef.current = devicePrivateKey;

    const decryptAndFormat = async (
      currentCache: Map<string, string | null>
    ) => {
      const newDisplayableMessages: BubbleItem[] = [];
      const newCacheEntries = new Map<string, string | null>();
      let localCacheWasUpdated = false;

      const reversedStoredMessages = [...groupMessages].reverse();

      for (let i = 0; i < reversedStoredMessages.length; i++) {
        const storedMsg = reversedStoredMessages[i];
        let plaintext: string | null = null;

        if (currentCache.has(storedMsg.id)) {
          plaintext = currentCache.get(storedMsg.id)!;
        } else {
          try {
            plaintext = await encryptionService.decryptStoredMessage(
              storedMsg,
              devicePrivateKey!
            );
          } catch (e) {
            console.error(`Error decrypting message ID ${storedMsg.id}:`, e);
            plaintext = "[Decryption Error]";
          }
          newCacheEntries.set(storedMsg.id, plaintext);
          localCacheWasUpdated = true;
        }

        const currentPlaintext = plaintext ?? "[Decryption Failed]";

        const senderInfo = usersMapRef.current[storedMsg.sender_id] || {
          id: storedMsg.sender_id,
          username: "Unknown User",
        };
        const messageUser: MessageUser = {
          id: senderInfo.id,
          username: senderInfo.username,
        };

        newDisplayableMessages.push({
          id: storedMsg.id,
          user: messageUser,
          text: currentPlaintext,
          align: storedMsg.sender_id === user?.id ? "right" : "left",
          timestamp: storedMsg.timestamp,
          type: "message",
        });

        const messageDate = new Date(storedMsg.timestamp);
        const dateString = messageDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const nextStoredMessage = reversedStoredMessages[i + 1];
        let shouldAddSeparator = false;
        if (!nextStoredMessage) {
          shouldAddSeparator = true;
        } else {
          const nextMessageDate = new Date(nextStoredMessage.timestamp);
          const nextDateString = nextMessageDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          shouldAddSeparator = dateString !== nextDateString;
        }
        if (shouldAddSeparator) {
          newDisplayableMessages.push({
            id: null,
            user: messageUser,
            text: "",
            align: "left",
            timestamp: storedMsg.timestamp,
            type: "date-separator",
            dateString,
          });
        }
      }

      setDisplayableMessages(newDisplayableMessages);

      if (localCacheWasUpdated) {
        setDecryptedContentCache(
          (prevCache) => new Map([...prevCache, ...newCacheEntries])
        );
      }
    };

    decryptAndFormat(keyChanged ? new Map() : decryptedContentCache);
  }, [groupMessages, devicePrivateKey, user?.id, decryptedContentCache]);

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
      removeClippedSubviews: true,
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
      swipeX.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });

      runOnJS(setIsActivelySwipping)(false);
      hapticTriggered.value = false;
    });

  const scrollToBottom = useCallback(
    (animated = true) => {
      if (scrollHandle.current) {
        clearTimeout(scrollHandle.current);
      }
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
        ? `date-${index}`
        : item.id?.toString() || `message-${index}`,
    []
  );

  const renderDateSeparator = useCallback(
    (dateString: string, index: number) => (
      <View key={`date-${index}`} className="my-4 items-center">
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
        return renderDateSeparator(item.dateString!, index);
      }
      return (
        <ChatBubble
          prevUserId={
            index < displayableMessages.length - 1 &&
            displayableMessages[index + 1].type === "message"
              ? displayableMessages[index + 1].user.id
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
                  if (!hasInitiallyScrolled.current) {
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
