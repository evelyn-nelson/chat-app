import { StyleSheet, Text, View } from "react-native";
import React from "react";
import AuthMenu from "@/components/AuthMenu/AuthMenu";
import { router } from "expo-router";
import { useAuthUtils } from "@/components/context/AuthUtilsContext";

const signin = () => {
  const { whoami } = useAuthUtils();
  return (
    <View>
      <AuthMenu
        onSubmit={async () => {
          await whoami();
          router.replace("/");
        }}
      />
    </View>
  );
};

export default signin;

const styles = StyleSheet.create({});
