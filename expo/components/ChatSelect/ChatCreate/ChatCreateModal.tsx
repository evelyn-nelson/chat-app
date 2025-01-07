import { Button, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import { ChatCreate } from "./ChatCreate";

const ChatCreateModal = () => {
  const [isChatCreateModalOpen, setIsChatCreateModalOpen] = useState(false);

  const closeModal = () => {
    setIsChatCreateModalOpen(false);
  };

  return (
    <View style={styles.container}>
      <Button
        title="Create new group"
        onPress={() => setIsChatCreateModalOpen(!isChatCreateModalOpen)}
      />
      <Modal
        visible={isChatCreateModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <ChatCreate onSubmit={closeModal} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default ChatCreateModal;

const styles = StyleSheet.create({
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: "75%",
    width: "75%",
    backgroundColor: "white",
    borderRadius: 10,
  },
  modalBackdrop: {
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
