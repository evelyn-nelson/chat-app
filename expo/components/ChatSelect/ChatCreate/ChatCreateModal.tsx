import { Pressable, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import { ChatCreateMenu } from "./ChatCreateMenu";
import BundleModal from "@/components/Global/BundleModal/BundleModal";
import Button from "@/components/Global/Button/Button";
import KeyboardAvoidingScrollView from "@/components/Global/KeyboardAvoidingScrollView/KeyboardAvoidingScrollView";

const ChatCreateModal = () => {
  const [isChatCreateModalOpen, setIsChatCreateModalOpen] = useState(false);

  const closeModal = () => {
    setIsChatCreateModalOpen(false);
  };

  return (
    <View className="flex items-center justify-center">
      <Text
        onPress={() => {
          setIsChatCreateModalOpen(true);
        }}
        className="text-xl font-semibold text-blue-950 hover:text-blue-900 active:text-blue-900 mt-3"
      >
        Create new group
      </Text>
      <BundleModal visible={isChatCreateModalOpen} closeModal={closeModal}>
        <KeyboardAvoidingScrollView>
          <ChatCreateMenu onSubmit={closeModal} />
        </KeyboardAvoidingScrollView>
      </BundleModal>
    </View>
  );
};

export default ChatCreateModal;
