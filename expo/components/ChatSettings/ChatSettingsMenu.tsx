import { Button, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import UserInviteMultiselect from "../Global/Multiselect/UserInviteMultiselect";
import { useWebSocket } from "../context/WebSocketContext";

const ChatSettingsMenu = (props: { groupId: number }) => {
  const { groupId } = props;
  const { inviteUsersToGroup } = useWebSocket();
  const [usersToInvite, setUsersToInvite] = useState<string[]>([]);
  return (
    <View>
      <UserInviteMultiselect
        placeholderText="Invite additional users"
        userList={usersToInvite}
        setUserList={setUsersToInvite}
      />
      <View style={styles.button}>
        <Button
          title={"Update"}
          onPress={async () => {
            try {
              await inviteUsersToGroup(usersToInvite, groupId);
              setUsersToInvite([]);
            } catch (error) {
              console.error(error);
            }
          }}
        />
      </View>
    </View>
  );
};

export default ChatSettingsMenu;

const styles = StyleSheet.create({
  button: { margin: 12, width: 250 },
});
