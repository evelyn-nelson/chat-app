import React from "react";
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
