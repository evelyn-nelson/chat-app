import React, { useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

type ExpoRouterModalProps = {
  children: React.ReactNode;
  title?: string;
  onClose?: () => void;
  scrollable?: boolean;
};

const ExpoRouterModal = ({
  children,
  title,
  onClose,
  scrollable = true,
}: ExpoRouterModalProps) => {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const dismissKeyboardAndClose = () => {
    Keyboard.dismiss();
    if (onClose) {
      onClose();
    }
    router.back();
  };

  const availableHeight = windowHeight - insets.top - 20;
  const modalMaxHeight = Math.min(availableHeight, windowHeight * 0.9);

  const keyboardOffset = 130;

  const ContentWrapper = scrollable ? ScrollView : View;

  const contentProps = scrollable
    ? {
        ref: scrollViewRef,
        keyboardShouldPersistTaps: "handled" as const,
        showsVerticalScrollIndicator: true,
        nestedScrollEnabled: true,
        contentContainerStyle: { paddingBottom: 16 },
        keyboardDismissMode: "interactive" as const,
      }
    : {};

  return (
    <View className="flex-1 bg-black/70">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={keyboardOffset}
      >
        <View
          style={{
            paddingTop: 10,
            paddingHorizontal: 16,
            flex: 1,
          }}
        >
          <View
            className="w-full max-w-[500px] bg-gray-800 rounded-xl overflow-hidden border border-blue-600/30 mx-auto"
            style={{
              maxHeight: modalMaxHeight,
            }}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-700">
              {/* Swipe indicator */}
              <View className="absolute top-2 left-1/2 transform -translate-x-1/2">
                <View className="w-8 h-1 bg-gray-600 rounded-full" />
              </View>
              <Text className="text-lg font-bold text-blue-400 mt-2">
                {title}
              </Text>
              <Pressable
                className="w-[30px] h-[30px] rounded-full bg-gray-700 items-center justify-center mt-2"
                onPress={dismissKeyboardAndClose}
              >
                <Text className="text-center text-white text-base">×</Text>
              </Pressable>
            </View>

            {/* Content */}
            <ContentWrapper className="px-4 py-4" {...contentProps}>
              {children}
            </ContentWrapper>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ExpoRouterModal;
