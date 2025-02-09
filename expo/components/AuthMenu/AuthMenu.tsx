import { Pressable, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import Button from "../Global/Button/Button";
import BundleModal from "../Global/BundleModal/BundleModal";

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
    <View className="h-screen flex items-center justify-center">
      <Text className="text-blue-300 text-8xl font-bold">Chat App</Text>
      <View className="mt-4">
        <Button
          onPress={() => setIsSignupModalOpen(!isSignupModalOpen)}
          text="Sign up"
          size={"3xl"}
        />
      </View>
      <View className="mt-2">
        <Button
          onPress={() => setIsLoginModalOpen(!isLoginModalOpen)}
          text="Sign in"
          size={"3xl"}
        />
      </View>
      <BundleModal visible={isSignupModalOpen} closeModal={closeModal}>
        <SignupForm onSubmit={furtherOnSubmit} />
      </BundleModal>
      <BundleModal visible={isLoginModalOpen} closeModal={closeModal}>
        <LoginForm onSubmit={furtherOnSubmit} />
      </BundleModal>
    </View>
  );
};

export default AuthMenu;
