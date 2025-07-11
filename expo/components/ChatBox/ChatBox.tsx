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
import {
  Group,
  MessageUser,
  DbMessage,
  ImageMessageContent,
} from "@/types/types";
import * as deviceService from "@/services/deviceService";
import * as encryptionService from "@/services/encryptionService";
import { DisplayableItem } from "./types";
import ImageBubble from "./ImageBubble";
import { v4 } from "uuid";
import { ImageViewer } from "./ImageViewer";
import { router } from "expo-router";

const SCROLL_THRESHOLD = 200;
const HAPTIC_THRESHOLD = -40;

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
  const { getMessagesForGroup, optimistic } = useMessageStore();
  const groupMessages = useMemo(() => {
    return getMessagesForGroup(group.id);
  }, [getMessagesForGroup, group.id]);

  const optimisticMessages = useMemo(() => {
    return optimistic[group.id] || [];
  }, [optimistic, group.id]);

  const flatListRef = useRef<FlatList<DisplayableItem> | null>(null);
  const lastCountRef = useRef(groupMessages.length);
  const scrollHandle = useRef<number | null>(null);
  const hasInitiallyScrolled = useRef(false);

  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  const [isActivelySwipping, setIsActivelySwipping] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleImagePress = (uri: string) => {
    const encoded = encodeURIComponent(uri);
    router.push(`/groups/images/${encoded}`);
  };

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

  const [displayableMessages, setDisplayableMessages] = useState<
    DisplayableItem[]
  >([]);
  const [decryptedContentCache, setDecryptedContentCache] = useState<
    Map<string, string | ImageMessageContent | null>
  >(new Map());

  useEffect(() => {
    const decryptAndFormatMessages = async () => {
      if (!devicePrivateKey) {
        if (displayableMessages.length > 0) {
          setDisplayableMessages([]);
        }
        if (prevDevicePrivateKeyRef.current !== null) {
          setDecryptedContentCache(new Map());
        }
        prevDevicePrivateKeyRef.current = null;
        return;
      }

      // Determine if the private key has changed since the last run.
      // If it has, invalidate the entire cache and re-decrypt everything.
      const keyHasChanged = !compareUint8Arrays(
        prevDevicePrivateKeyRef.current,
        devicePrivateKey
      );

      if (groupMessages.length === 0) {
        if (displayableMessages.length > 0) {
          setDisplayableMessages([]);
        }
        return;
      }

      const finalDisplayableItems: DisplayableItem[] = [];
      const newCacheEntries = new Map<
        string,
        string | ImageMessageContent | null
      >();
      let needsUIUpdate = false;

      const sortedMessages = [...groupMessages].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      for (let i = 0; i < sortedMessages.length; i++) {
        const currentMsg = sortedMessages[i];
        let decryptedContent: string | ImageMessageContent | null = null;

        if (!keyHasChanged && decryptedContentCache.has(currentMsg.id)) {
          decryptedContent = decryptedContentCache.get(currentMsg.id)!;
        } else {
          needsUIUpdate = true;
          const plaintext = await encryptionService.decryptStoredMessage(
            currentMsg,
            devicePrivateKey
          );

          if (plaintext) {
            switch (currentMsg.message_type) {
              case "image":
                try {
                  decryptedContent = JSON.parse(
                    plaintext
                  ) as ImageMessageContent;
                } catch (e) {
                  console.error(
                    `Failed to parse image JSON for message ${currentMsg.id}:`,
                    e
                  );
                  decryptedContent = "[Invalid Image Data]";
                }
                break;

              case "text":
              default:
                decryptedContent = plaintext;
                break;
            }
          } else {
            decryptedContent = "[Decryption Failed]";
          }
          newCacheEntries.set(currentMsg.id, decryptedContent);
        }

        // Date Separator
        const prevMsg = i > 0 ? sortedMessages[i - 1] : null;
        const currentDate = new Date(currentMsg.timestamp);
        if (
          !prevMsg ||
          new Date(prevMsg.timestamp).toDateString() !==
            currentDate.toDateString()
        ) {
          const dateString = currentDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          finalDisplayableItems.push({
            type: "date_separator",
            id: currentDate.toDateString(),
            groupId: group.id,
            dateString: dateString,
            timestamp: dateString,
          });
        }

        const senderInfo = usersMapRef.current[currentMsg.sender_id] || {
          id: currentMsg.sender_id,
          username: "Unknown User",
        };

        if (typeof decryptedContent === "string") {
          finalDisplayableItems.push({
            type: "message_text",
            id: currentMsg.id,
            groupId: group.id,
            user: senderInfo,
            content: decryptedContent,
            align: currentMsg.sender_id === user?.id ? "right" : "left",
            timestamp: currentMsg.timestamp,
          });
        } else if (decryptedContent) {
          const optimisticMessage = optimisticMessages.find(
            (o) => o.id === currentMsg.id && o.type === "message_image"
          );

          const imageContent = decryptedContent as ImageMessageContent;

          if (
            optimisticMessage &&
            optimisticMessage.type === "message_image" &&
            optimisticMessage.content.localUri
          ) {
            imageContent.localUri = optimisticMessage.content.localUri;
          }

          finalDisplayableItems.push({
            type: "message_image",
            id: currentMsg.id,
            groupId: group.id,
            user: senderInfo,
            content: imageContent,
            align: currentMsg.sender_id === user?.id ? "right" : "left",
            timestamp: currentMsg.timestamp,
          });
        }
      }

      // 6. Update State: Only update React state if something has actually changed.
      // This prevents unnecessary re-renders.

      // Only show optimistic messages that don't have a corresponding real message yet
      const filteredOptimistic = optimisticMessages.filter(
        (o) => !groupMessages.find((m) => m.id === o.id)
      );

      const sortedFinalItems = finalDisplayableItems.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const allDisplayableItems = [...sortedFinalItems, ...filteredOptimistic];

      if (
        needsUIUpdate ||
        displayableMessages.length !== allDisplayableItems.length ||
        filteredOptimistic.length > 0
      ) {
        setDisplayableMessages(allDisplayableItems.reverse());

        if (newCacheEntries.size > 0) {
          setDecryptedContentCache(
            (prevCache) => new Map([...prevCache, ...newCacheEntries])
          );
        }
      }

      prevDevicePrivateKeyRef.current = devicePrivateKey
        ? new Uint8Array(devicePrivateKey)
        : null;
    };

    decryptAndFormatMessages();
  }, [groupMessages, devicePrivateKey, user?.id, optimisticMessages]);

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

  const keyExtractor = useCallback((item: DisplayableItem) => {
    return item.id;
  }, []);

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
    ({ item, index }: { item: DisplayableItem; index: number }) => {
      const prevItem = displayableMessages[index + 1];
      const prevUserId =
        prevItem &&
        (prevItem.type === "message_text" || prevItem.type === "message_image")
          ? prevItem.user.id
          : "";

      switch (item.type) {
        case "date_separator":
          return renderDateSeparator(item.dateString, item.id);

        case "message_text":
          return (
            <ChatBubble
              prevUserId={prevUserId}
              user={item.user}
              message={item.content}
              align={item.align}
              timestamp={item.timestamp}
              swipeX={swipeX}
              showTimestamp={isActivelySwipping}
            />
          );

        case "message_image":
          return (
            <ImageBubble
              key={item.id}
              prevUserId={prevUserId}
              user={item.user}
              content={item.content}
              align={item.align}
              timestamp={item.timestamp}
              swipeX={swipeX}
              showTimestamp={isActivelySwipping}
              onImagePress={handleImagePress}
            />
          );

        default:
          return null;
      }
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
