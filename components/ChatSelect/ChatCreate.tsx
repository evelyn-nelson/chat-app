import { Group, User } from "@/types/types";
import { Dispatch, SetStateAction, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useWebSocket } from "../context/WebSocketContext";
import { router } from "expo-router";

export const ChatCreate = (props: { user: User }) => {
  const [groupName, setGroupName] = useState<string>("");
  const { createGroup } = useWebSocket();
  const { user } = props;

  return (
    <View>
      <TextInput
        style={styles.input}
        onChangeText={(event) => {
          setGroupName(event);
        }}
        onSubmitEditing={async () => {
          const group = await createGroup(groupName, user);
          setGroupName("");
          if (group) {
            router.push({ pathname: "/group/[id]", params: { id: group.id } });
          }
        }}
        value={groupName}
        placeholder="Create new chat group"
      />
    </View>
  );
};

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
