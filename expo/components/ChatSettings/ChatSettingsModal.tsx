import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ChatCreate } from "../ChatSelect/ChatCreate/ChatCreate";
import ChatSettingsMenu from "./ChatSettingsMenu";
import { Group } from "@/types/types";

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
        style={{
          height: 40,
          width: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onPress={() => setIsChatSettingsModalOpen(!isChatSettingsModalOpen)}
      >
        {({ pressed }) => (
          <Ionicons
            name={"ellipsis-horizontal-outline"}
            size={20}
            color={pressed ? "gray" : "black"}
          />
        )}
      </Pressable>
      <Modal
        visible={isChatSettingsModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <ChatSettingsMenu group={group} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default ChatSettingsModal;

const styles = StyleSheet.create({
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContainer: {
    cursor: "auto",
    justifyContent: "center",
    alignItems: "center",
    height: "75%",
    width: "75%",
    backgroundColor: "white",
    borderRadius: 10,
  },
  modalBackdrop: {
    cursor: "auto",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});
