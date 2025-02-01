import { Button, Platform, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import UserInviteMultiselect from "../Global/Multiselect/UserInviteMultiselect";
import { useWebSocket } from "../context/WebSocketContext";
import { Group, User } from "@/types/types";
import UserList from "./UserList";

const ChatSettingsMenu = (props: { group: Group }) => {
  const { group } = props;
  const { inviteUsersToGroup } = useWebSocket();
  const [usersToInvite, setUsersToInvite] = useState<string[]>([]);
  const [excludedUserList, setExcludedUserList] = useState<User[]>(
    group.group_users
  );
  return (
    <View
      style={[
        styles.container,
        Platform.OS === "web" ? styles.webAlign : styles.nativeAlign,
      ]}
    >
      <View style={styles.listContainer}>
        <UserList group={group} />
      </View>
      <View style={styles.controlsContainer}>
        <UserInviteMultiselect
          placeholderText="Invite additional users"
          userList={usersToInvite}
          setUserList={setUsersToInvite}
          excludedUserList={excludedUserList}
          setExcludedUserList={setExcludedUserList}
        />
        {usersToInvite.length > 0 && (
          <View style={styles.button}>
            <Button
              title={"Add new users"}
              onPress={async () => {
                try {
                  await inviteUsersToGroup(usersToInvite, group.id);
                  setUsersToInvite([]);
                } catch (error) {
                  console.error(error);
                }
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
};

export default ChatSettingsMenu;

const styles = StyleSheet.create({
  container: {
    paddingLeft: 12,
    height: "100%",
    maxHeight: 600,
    width: "100%",
    maxWidth: 350,
  },
  listContainer: {
    marginBottom: 16,
  },
  controlsContainer: {
    width: 300,
  },
  button: {
    margin: 12,
    width: 300,
  },
  webAlign: {
    marginLeft: 42,
    alignSelf: "flex-start",
  },
  nativeAlign: {
    marginLeft: 12,
  },
});
