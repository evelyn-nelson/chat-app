import React from "react";
import { ChatCreateMenu } from "@/components/ChatSelect/ChatCreate/ChatCreateMenu";
import { router } from "expo-router";
import ExpoRouterModal from "@/components/Global/Modal/ExpoRouterModal";
import SignupForm from "@/components/AuthMenu/SignupForm";

const Login = () => {
  return (
    <ExpoRouterModal title="Create Account" scrollable={false}>
      <SignupForm />
    </ExpoRouterModal>
  );
};

export default Login;
