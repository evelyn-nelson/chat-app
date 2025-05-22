import React from "react";
import { ChatCreateMenu } from "@/components/ChatSelect/ChatCreate/ChatCreateMenu";
import { router } from "expo-router";
import ExpoRouterModal from "@/components/Global/Modal/ExpoRouterModal";
import LoginForm from "@/components/AuthMenu/LoginForm";

const Login = () => {
  return (
    <ExpoRouterModal title="Welcome Back">
      <LoginForm />
    </ExpoRouterModal>
  );
};

export default Login;
