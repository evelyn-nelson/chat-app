import { Dispatch, SetStateAction, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { User } from "@/types/types";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { save } from "@/util/custom-store";
export default function LoginForm(props: { onSubmitAction: () => void }) {
  const { onSubmitAction } = props;
  const [email, setEmail] = useState<string>();
  const [password, setPassword] = useState<string>();

  const login = (email: string, password: string) => {
    console.log(process.env.EXPO_PUBLIC_HOST);
    axios
      .post(`http://${process.env.EXPO_PUBLIC_HOST}/auth/login`, {
        email: email,
        password: password,
      })
      .then(async (response) => {
        const { data } = response;
        await save("jwt", data.token);
        onSubmitAction();
      })
      .catch((error) => {
        console.error("error signing in", error);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sign In</Text>
      <Text style={styles.inputTitle}>Enter Email</Text>
      <TextInput
        style={styles.input}
        onChangeText={(event) => {
          setEmail(event);
        }}
      />
      <Text style={styles.inputTitle}>Enter Password</Text>
      <TextInput
        secureTextEntry={true}
        style={styles.input}
        onChangeText={(event) => {
          setPassword(event);
        }}
        onSubmitEditing={() => {
          if (email && password) {
            login(email, password);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 5,
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
