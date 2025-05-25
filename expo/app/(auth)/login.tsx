import React from "react";
import ExpoRouterModal from "@/components/Global/Modal/ExpoRouterModal";
import LoginForm from "@/components/AuthMenu/LoginForm";

const Login = () => {
  return (
    <ExpoRouterModal title="Welcome Back" scrollable={false}>
      <LoginForm />
    </ExpoRouterModal>
  );
};

export default Login;
