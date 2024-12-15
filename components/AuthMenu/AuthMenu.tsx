import { StyleSheet, Text, View } from "react-native";
import React from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

const AuthMenu = (props: { onSubmitAction: () => void }) => {
  const { onSubmitAction } = props;
  return (
    <View>
      {/* <SignupForm onSubmitAction={onSubmitAction} /> */}
      <LoginForm onSubmitAction={onSubmitAction} />
    </View>
  );
};

export default AuthMenu;

const styles = StyleSheet.create({});
