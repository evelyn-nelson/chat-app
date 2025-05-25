import React from "react";
import { ChatCreateMenu } from "@/components/ChatSelect/ChatCreate/ChatCreateMenu";
import { router } from "expo-router";
import ExpoRouterModal from "@/components/Global/Modal/ExpoRouterModal";

const ChatCreate = () => {
  return (
    <ExpoRouterModal title="Create Group">
      <ChatCreateMenu onSubmit={() => router.back()} />
    </ExpoRouterModal>
  );
};

export default ChatCreate;
