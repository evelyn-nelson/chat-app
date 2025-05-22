// app/groups/chat-create-modal.tsx
import React from "react";
import { ChatCreateMenu } from "@/components/ChatSelect/ChatCreate/ChatCreateMenu";
import { router } from "expo-router";
import ExpoRouterModal from "@/components/Global/Modal/ExpoRouterModal";

const ChatCreateModalLayout = () => {
  return (
    <ExpoRouterModal title="Create Group">
      <ChatCreateMenu onSubmit={() => router.back()} isModal={true} />
    </ExpoRouterModal>
  );
};

export default ChatCreateModalLayout;
