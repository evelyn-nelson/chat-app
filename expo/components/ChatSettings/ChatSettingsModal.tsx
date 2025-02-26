import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ChatCreate } from "../ChatSelect/ChatCreate/ChatCreate";
import ChatSettingsMenu from "./ChatSettingsMenu";
import { Group } from "@/types/types";
import BundleModal from "../Global/BundleModal/BundleModal";
import KeyboardAvoidingScrollView from "../Global/KeyboardAvoidingScrollView/KeyboardAvoidingScrollView";

const ChatSettingsModal = (props: { group: Group }) => {
  const [isChatSettingsModalOpen, setIsChatSettingsModalOpen] =
    useState<boolean>(false);

  const closeModal = () => {
    setIsChatSettingsModalOpen(false);
  };
  const { group } = props;
  if (!group.id) {
    return <View />;
  }
  return (
    <View>
      <Pressable
        className="h-[40] w-[40] flex items-center justify-center"
        onPress={() => setIsChatSettingsModalOpen(!isChatSettingsModalOpen)}
      >
        {({ pressed }) => (
          <Ionicons
            name={"ellipsis-horizontal-outline"}
            size={20}
            color={pressed ? "gray" : "#1E3A8A"}
          />
        )}
      </Pressable>
      <BundleModal visible={isChatSettingsModalOpen} closeModal={closeModal}>
        <KeyboardAvoidingScrollView>
          <ChatSettingsMenu group={group} />
        </KeyboardAvoidingScrollView>
      </BundleModal>
    </View>
  );
};

export default ChatSettingsModal;
