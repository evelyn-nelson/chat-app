import { StyleSheet, Text, View, Modal, Pressable } from "react-native";
import React from "react";

type BundleModalProps = {
  visible: boolean;
  closeModal: () => void;
  children: React.ReactNode;
};

const BundleModal = (props: BundleModalProps) => {
  const { visible, closeModal, children } = props;
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={closeModal}
    >
      <Pressable
        onPress={closeModal}
        className="cursor-auto absolute top-0 left-0 right-0 bottom-0 justify-center items-center bg-[rgba(0,0,0,0.5)]"
      >
        <Pressable
          className="cursor-auto justify-center align-center bg-blue-300 border-4 border-blue-600"
          onPress={(e) => e.stopPropagation()}
          style={{ maxHeight: "75%", maxWidth: "85%" }}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default BundleModal;
