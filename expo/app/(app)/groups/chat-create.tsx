import React, { useCallback } from "react";
import { ChatCreateMenu } from "@/components/ChatSelect/ChatCreate/ChatCreateMenu";
import { router } from "expo-router";
import ExpoRouterModal from "@/components/Global/Modal/ExpoRouterModal";

const ChatCreate = () => {
  const onSubmit = useCallback(() => {
    router.back();
  }, []);
  return (
    <ExpoRouterModal title="Create Group">
      <ChatCreateMenu onSubmit={onSubmit} />
    </ExpoRouterModal>
  );
};

export default ChatCreate;
