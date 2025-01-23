import { Group, User } from "@/types/types";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { useWebSocket } from "../../context/WebSocketContext";
import { router } from "expo-router";
import { useGlobalStore } from "../../context/GlobalStoreContext";
import UserInviteMultiselect from "../../Global/UserInviteMultiselect";

export const ChatCreate = (props: { onSubmit: () => void }) => {
  const { store, groupsRefreshKey } = useGlobalStore();

  const [groupName, setGroupName] = useState<string>("");
  const [usersToInvite, setUsersToInvite] = useState<string[]>([]);
  const { createGroup, inviteUsersToGroup, getGroups } = useWebSocket();

  return (
    <View>
      <TextInput
        style={styles.input}
        onChangeText={(event) => {
          setGroupName(event);
        }}
        value={groupName}
        placeholder="Group name"
      />
      <UserInviteMultiselect
        userList={usersToInvite}
        setUserList={setUsersToInvite}
      />
      <View style={styles.button}>
        <Button
          title={"Create"}
          onPress={async () => {
            const group = await createGroup(groupName);
            setGroupName("");
            if (group && usersToInvite) {
              await inviteUsersToGroup(usersToInvite, group.id);
              setUsersToInvite([]);
            }
            props.onSubmit();
            if (group) {
              router.push(`/groups/${group.id}`);
              try {
                const groups = await getGroups();
                store.saveGroups(groups);
              } catch (error) {
                console.error(error);
              }
            }
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    height: 40,
    width: 250,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
  header: {
    marginLeft: 12,
  },
  button: { margin: 12, width: 250 },
});
