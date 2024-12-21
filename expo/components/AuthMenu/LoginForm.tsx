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
    <View style={styles.container}>
      <Text style={styles.header}>Sign In</Text>
      <Text style={styles.inputTitle}>Enter Email</Text>
      <TextInput
        autoFocus
        autoCapitalize="none"
        style={styles.input}
        onChangeText={(event) => {
          setEmail(event);
        }}
      />
      <Text style={styles.inputTitle}>Enter Password</Text>
      <TextInput
        secureTextEntry={true}
        autoCapitalize="none"
        style={styles.input}
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

const styles = StyleSheet.create({
  container: {
    borderWidth: 5,
    height: 300,
    width: 400,
    margin: 10,
    padding: 4,
  },
  input: {
    height: 40,
    width: 300,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
  header: {
    marginLeft: 12,
    fontWeight: "bold",
    fontSize: 20,
  },
  inputTitle: {
    marginLeft: 12,
  },
});
