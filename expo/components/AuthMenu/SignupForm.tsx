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
    <View style={styles.container}>
      <Text style={styles.header}>Sign Up</Text>
      <Text style={styles.inputTitle}>Enter Email</Text>
      <TextInput
        autoFocus
        autoCapitalize="none"
        style={styles.input}
        onChangeText={(event) => {
          setEmail(event);
        }}
      />
      <Text style={styles.inputTitle}>Enter Username</Text>
      <TextInput
        autoCapitalize="none"
        style={styles.input}
        onChangeText={(event) => {
          setUsername(event);
        }}
      />
      <Text style={styles.inputTitle}>Enter Password</Text>
      <TextInput
        autoCapitalize="none"
        secureTextEntry={true}
        style={styles.input}
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
