import { DateOptions, Group, User } from "@/types/types";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useWebSocket } from "../../context/WebSocketContext";
import { router } from "expo-router";
import { useGlobalStore } from "../../context/GlobalStoreContext";
import UserInviteMultiselect from "../../Global/Multiselect/UserInviteMultiselect";
import Button from "@/components/Global/Button/Button";
import GroupDateOptions from "@/components/Global/GroupDateOptions/GroupDateOptions";

export const ChatCreateMenu = (props: { onSubmit: () => void }) => {
  const { user: self, store, groupsRefreshKey } = useGlobalStore();

  const [groupName, setGroupName] = useState<string>("");
  const [usersToInvite, setUsersToInvite] = useState<string[]>([]);
  const [dateOptions, setDateOptions] = useState<DateOptions | undefined>();
  const { createGroup, inviteUsersToGroup, getGroups } = useWebSocket();
  if (!self) {
    return <View></View>;
  }
  return (
    <View>
      <TextInput
        className="h-[40] w-[280] m-[12] border border-blue-950 text-blue-950 p-[10]"
        onChangeText={(event) => {
          setGroupName(event);
        }}
        value={groupName}
        placeholder="Group name"
      />
      <View className="m-[12]">
        <GroupDateOptions
          dateOptions={dateOptions}
          setDateOptions={setDateOptions}
        />
      </View>

      <View className="ml-[12] z-50s">
        <UserInviteMultiselect
          placeholderText="Users to invite"
          userList={usersToInvite}
          setUserList={setUsersToInvite}
          excludedUserList={[self]}
        />
      </View>
      <View className="w-[280] ml-[12] mt-2">
        <Button
          border={false}
          size="lg"
          text={"Create"}
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
    width: 280,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
  header: {
    marginLeft: 12,
  },
  button: { margin: 12, width: 300 },
});
