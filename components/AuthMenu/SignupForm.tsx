import { Dispatch, SetStateAction, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { User } from "@/types/types";
import { setItemAsync } from "expo-secure-store";
import axios from "axios";
import { save } from "@/util/custom-store";
export default function SignupForm(props: { onSubmitAction: () => void }) {
  const { onSubmitAction } = props;
  const [username, setUsername] = useState<string>();
  const [email, setEmail] = useState<string>();
  const [password, setPassword] = useState<string>();

  const signup = (username: string, email: string, password: string) => {
    console.log("username", username);
    axios
      .post(`http://${process.env.EXPO_PUBLIC_HOST}/auth/signup`, {
        username: username,
        email: email,
        password: password,
      })
      .then((response) => {
        const { data } = response;
        save("jwt", data.token);
        onSubmitAction();
      })
      .catch((error) => {
        console.error("error signing up", error);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sign Up</Text>
      <Text style={styles.inputTitle}>Enter Email</Text>
      <TextInput
        style={styles.input}
        onChangeText={(event) => {
          setEmail(event);
        }}
      />
      <Text style={styles.inputTitle}>Enter Username</Text>
      <TextInput
        style={styles.input}
        onChangeText={(event) => {
          setUsername(event);
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
          if (username && email && password) {
            signup(username, email, password);
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
