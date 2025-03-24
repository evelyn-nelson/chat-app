import {
  Text,
  View,
  Modal,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import React, { useEffect, useState } from "react";

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { height: screenHeight } = Dimensions.get("window");

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Calculate available height for modal content
  const availableHeight = screenHeight - keyboardHeight - 100; // 100px buffer

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={closeModal}
    >
      <View
        style={{
          flex: 1,
          justifyContent: keyboardHeight > 0 ? "flex-start" : "center",
          paddingTop: keyboardHeight > 0 ? 40 : 0,
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.7)",
        }}
      >
        {/* Modal background press handler */}
        <Pressable
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          onPress={() => {
            Keyboard.dismiss();
            closeModal();
          }}
        />

        {/* Modal content container */}
        <View
          style={{
            width: "90%",
            maxWidth: 500,
            maxHeight: availableHeight,
            backgroundColor: "#1F2937", // gray-800
            borderRadius: 12,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(37, 99, 235, 0.3)", // blue-600/30
          }}
        >
          {/* Modal header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#374151", // gray-700
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#60A5FA",
              }}
            >
              {title}
            </Text>
            <Pressable
              onPress={closeModal}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: "#374151", // gray-700
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontSize: 16 }}>×</Text>
            </Pressable>
          </View>

          {/* Modal content with scroll */}
          <ScrollView
            style={{ maxHeight: availableHeight - 60 }}
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <Pressable onPress={() => {}} style={{ flex: 1 }}>
              {children}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ChatAppModal;
