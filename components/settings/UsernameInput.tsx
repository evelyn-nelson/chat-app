import { Dispatch, SetStateAction, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { User } from "@/types/types";
export default function UsernameInput(props: {
  passValueToParent: Dispatch<SetStateAction<User | undefined>>;
  onSubmitAction: () => void;
}) {
  const { passValueToParent, onSubmitAction } = props;
  const [user, setUser] = useState<User>();

  return (
    <View>
      <Text style={styles.header}>Enter Username</Text>
      <TextInput
        style={styles.input}
        onChangeText={(event) => {
          setUser({ username: event });
        }}
        onSubmitEditing={() => {
          if (user) {
            passValueToParent(user);
          }
          onSubmitAction();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 40,
    width: 300,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
  header: {
    marginLeft: 12,
  },
});
