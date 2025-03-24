import { View } from "react-native";
import React, { useState } from "react";
import { ChatCreateMenu } from "./ChatCreateMenu";
import ChatAppModal from "@/components/Global/Modal/ChatAppModal";
import Button from "@/components/Global/Button/Button";

const ChatCreateModal = () => {
  const [isChatCreateModalOpen, setIsChatCreateModalOpen] = useState(false);

  const closeModal = () => {
    setIsChatCreateModalOpen(false);
  };

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Button
        onPress={() => setIsChatCreateModalOpen(true)}
        text="Create New Group"
        size="base"
        variant="secondary"
        className="mt-3"
      />

      <ChatAppModal
        visible={isChatCreateModalOpen}
        closeModal={closeModal}
        title="Create New Group"
      >
        <ChatCreateMenu onSubmit={closeModal} />
      </ChatAppModal>
    </View>
  );
};

export default ChatCreateModal;
