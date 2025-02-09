import { Dispatch, SetStateAction, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { User } from "@/types/types";
import { setItemAsync } from "expo-secure-store";
import axios from "axios";
import { save } from "@/util/custom-store";
import { useAuthUtils } from "../context/AuthUtilsContext";
export default function SignupForm(props: { onSubmit: () => void }) {
  const { onSubmit } = props;
  const { signup } = useAuthUtils();

  const [username, setUsername] = useState<string>();
  const [email, setEmail] = useState<string>();
  const [password, setPassword] = useState<string>();

  return (
    <View className="h-[300] w-[400]">
      <Text className="ml-[12] font-bold text-2xl mb-1 mt-1 color-blue-900">
        Sign Up
      </Text>
      <Text className="ml-[12] color-blue-900">Enter Email</Text>
      <TextInput
        autoFocus
        autoCapitalize="none"
        className="h-[40] w-[300] m-[12] border border-blue-900 p-[10] text-blue-900"
        onChangeText={(event) => {
          setEmail(event);
        }}
      />
      <Text className="ml-[12] color-blue-900">Enter Username</Text>
      <TextInput
        autoCapitalize="none"
        className="h-[40] w-[300] m-[12] border border-blue-900 p-[10] text-blue-900"
        onChangeText={(event) => {
          setUsername(event);
        }}
      />
      <Text className="ml-[12] color-blue-900">Enter Password</Text>
      <TextInput
        autoCapitalize="none"
        secureTextEntry={true}
        className="h-[40] w-[300] m-[12] border border-blue-900 p-[10] text-blue-900"
        onChangeText={(event) => {
          setPassword(event);
        }}
        onSubmitEditing={() => {
          if (username && email && password) {
            signup(username, email, password)
              .then(onSubmit)
              .catch((error) => console.error(error));
          }
        }}
      />
    </View>
  );
}
