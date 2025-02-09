import { Platform, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import UserInviteMultiselect from "../Global/Multiselect/UserInviteMultiselect";
import { useWebSocket } from "../context/WebSocketContext";
import { Group, User } from "@/types/types";
import UserList from "./UserList";
import Button from "../Global/Button/Button";

const ChatSettingsMenu = (props: { group: Group }) => {
  const { group } = props;
  const { inviteUsersToGroup } = useWebSocket();
  const [usersToInvite, setUsersToInvite] = useState<string[]>([]);
  const excludedUserList = group.group_users;
  return (
    <View
      className={`${Platform.OS === "web" ? "self-start w-[85%] ml-[12]" : "w-full"} h-full  max-h-[600]`}
    >
      <View className="mb-[16]">
        <UserList group={group} />
      </View>
      <View className="w-[300]">
        <View className="z-50">
          <UserInviteMultiselect
            placeholderText="Invite additional users"
            userList={usersToInvite}
            setUserList={setUsersToInvite}
            excludedUserList={excludedUserList}
          />
        </View>
        {usersToInvite.length > 0 && (
          <Button
            text={"Add new users"}
            size="xl"
            onPress={async () => {
              try {
                await inviteUsersToGroup(usersToInvite, group.id);
                setUsersToInvite([]);
              } catch (error) {
                console.error(error);
              }
            }}
          />
        )}
      </View>
    </View>
  );
};

export default ChatSettingsMenu;
