import {
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ChatAppModalProps = {
  visible: boolean;
  closeModal: () => void;
  children: React.ReactNode;
  title?: string;
};

const ChatAppModal = ({
  visible,
  closeModal,
  children,
  title,
}: ChatAppModalProps) => {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const dismissKeyboardAndClose = () => {
    Keyboard.dismiss();
    closeModal();
  };

  // Calculate top position with more padding for tall modals
  const topPadding = Math.max(insets.top + 20, 40); // At least 40px from top

  // Calculate available height for the modal with more bottom margin
  const bottomMargin = 60; // Increased from 40 to 60
  const availableHeight = windowHeight - topPadding - bottomMargin;
  const modalMaxHeight = Math.min(availableHeight, windowHeight * 0.8); // Reduced from 0.85 to 0.8

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={closeModal}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboardAndClose}>
        <View className="flex-1 bg-black/70">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 30 : 20}
          >
            <View
              className="flex-1 justify-center items-center px-4"
              style={{
                paddingTop: topPadding,
              }}
            >
              <View
                className="w-full max-w-[500px] bg-gray-800 rounded-xl overflow-hidden border border-blue-600/30"
                style={{
                  maxHeight: modalMaxHeight,
                }}
              >
                {/* Header */}
                <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-700">
                  <Text className="text-lg font-bold text-blue-400">
                    {title}
                  </Text>
                  <Pressable
                    className="w-[30px] h-[30px] rounded-full bg-gray-700 items-center justify-center"
                    onPress={closeModal}
                  >
                    <Text className="text-center text-white text-base">×</Text>
                  </Pressable>
                </View>

                {/* Content */}
                <ScrollView
                  className="px-4 py-4"
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  contentContainerStyle={{ paddingBottom: 16 }}
                >
                  <TouchableWithoutFeedback>
                    <View>{children}</View>
                  </TouchableWithoutFeedback>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default ChatAppModal;
