import { Button, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

const AuthMenu = (props: { onSubmit: () => void }) => {
  const { onSubmit } = props;
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  const closeModal = () => {
    setIsLoginModalOpen(false);
    setIsSignupModalOpen(false);
  };

  const furtherOnSubmit = async () => {
    closeModal();
    await onSubmit();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat App</Text>
      <Button
        title="Sign Up"
        onPress={() => setIsSignupModalOpen(!isSignupModalOpen)}
      />
      <Button
        title="Sign in"
        onPress={() => setIsLoginModalOpen(!isLoginModalOpen)}
      />
      <Modal
        visible={isSignupModalOpen}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <SignupForm onSubmit={furtherOnSubmit} />
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={isLoginModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <LoginForm onSubmit={furtherOnSubmit} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default AuthMenu;

const styles = StyleSheet.create({
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
  title: {
    fontWeight: "bold",
    fontSize: 60,
  },
  modalContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: 300,
    width: 400,
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 150,
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
