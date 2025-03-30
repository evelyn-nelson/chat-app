import { Pressable, View } from "react-native";
import React, { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import ChatSettingsMenu from "./ChatSettingsMenu";
import { Group } from "@/types/types";
import ChatAppModal from "../Global/Modal/ChatAppModal";

const ChatSettingsModal = (props: { group: Group }) => {
  const [isChatSettingsModalOpen, setIsChatSettingsModalOpen] =
    useState<boolean>(false);
  const { group } = props;

  const closeModal = () => {
    setIsChatSettingsModalOpen(false);
  };

  if (!group.id) {
    return <View />;
  }

  return (
    <View className="justify-center items-center">
      <Pressable
        className="h-[40] w-[40] flex items-center justify-center"
        onPress={() => setIsChatSettingsModalOpen(!isChatSettingsModalOpen)}
      >
        {({ pressed }) => (
          <Ionicons
            name={"ellipsis-horizontal-outline"}
            size={20}
            color={pressed ? "gray" : "white"}
          />
        )}
      </Pressable>

      <ChatAppModal
        visible={isChatSettingsModalOpen}
        closeModal={closeModal}
        title="Group Settings"
      >
        <ChatSettingsMenu group={group} />
      </ChatAppModal>
    </View>
  );
};

export default ChatSettingsModal;
