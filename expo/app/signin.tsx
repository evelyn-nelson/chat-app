import { StyleSheet, Text, View } from "react-native";
import React from "react";
import AuthMenu from "@/components/AuthMenu/AuthMenu";
import { router } from "expo-router";
import { useAuthUtils } from "@/components/context/AuthUtilsContext";

const signin = () => {
  const { whoami } = useAuthUtils();
  return (
    <View className="bg-blue-500">
      <AuthMenu
        onSubmit={async () => {
          router.replace("/");
        }}
      />
    </View>
  );
};

export default signin;
