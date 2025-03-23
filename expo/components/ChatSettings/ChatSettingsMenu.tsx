import { Platform, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import UserInviteMultiselect from "../Global/Multiselect/UserInviteMultiselect";
import { useWebSocket } from "../context/WebSocketContext";
import { DateOptions, Group, User } from "@/types/types";
import UserList from "./UserList";
import Button from "../Global/Button/Button";
import GroupDateOptions from "../Global/GroupDateOptions/GroupDateOptions";

const ChatSettingsMenu = (props: { group: Group }) => {
  const { group } = props;
  const { inviteUsersToGroup } = useWebSocket();
  const [usersToInvite, setUsersToInvite] = useState<string[]>([]);
  const [dateOptions, setDateOptions] = useState<DateOptions | undefined>();
  const excludedUserList = group.group_users;
  return (
    <View
      className={`${Platform.OS === "web" ? "self-start w-[85%] ml-[12]" : "w-full"} h-full  max-h-[600]`}
    >
      <View className="mb-[16]">
        <UserList group={group} />
      </View>
      <View className="w-[280]">
        <View className="z-50">
          <GroupDateOptions
            dateOptions={dateOptions}
            setDateOptions={setDateOptions}
          />
          <UserInviteMultiselect
            placeholderText="Invite additional users"
            userList={usersToInvite}
            setUserList={setUsersToInvite}
            excludedUserList={excludedUserList}
          />
        </View>
        {usersToInvite.length > 0 && (
          <View className="pt-2">
            <Button
              border={false}
              text={"Add new users"}
              size="xl"
              className="min-w-[280]"
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
