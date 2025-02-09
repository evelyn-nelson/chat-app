import { Dispatch, SetStateAction, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { save } from "@/util/custom-store";
import { useAuthUtils } from "../context/AuthUtilsContext";
export default function LoginForm(props: { onSubmit: () => void }) {
  const { onSubmit } = props;
  const { login } = useAuthUtils();

  const [email, setEmail] = useState<string>();
  const [password, setPassword] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      onSubmit();
    } catch (err) {
      setError("Login failed. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="h-[300] w-[400]">
      <Text className="ml-[12] font-bold text-2xl mb-1 mt-1 color-blue-900">
        Sign In
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
      <Text className="ml-[12] color-blue-900">Enter Password</Text>
      <TextInput
        secureTextEntry={true}
        autoCapitalize="none"
        className="h-[40] w-[300] m-[12] border border-blue-900 p-[10] text-blue-900"
        onChangeText={(event) => {
          setPassword(event);
        }}
        onSubmitEditing={async () => {
          if (email && password) {
            handleLogin(email, password);
          }
        }}
      />
    </View>
  );
}