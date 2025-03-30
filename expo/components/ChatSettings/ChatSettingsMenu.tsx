import { Platform, Text, View } from "react-native";
import React, { useState } from "react";
import UserInviteMultiselect from "../Global/Multiselect/UserInviteMultiselect";
import { useWebSocket } from "../context/WebSocketContext";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { DateOptions, Group } from "@/types/types";
import UserList from "./UserList";
import Button from "../Global/Button/Button";
import GroupDateOptions from "../Global/GroupDateOptions/GroupDateOptions";

const ChatSettingsMenu = (props: { group: Group }) => {
  const { group } = props;
  const { inviteUsersToGroup } = useWebSocket();
  const { refreshGroups } = useGlobalStore();
  const [usersToInvite, setUsersToInvite] = useState<string[]>([]);
  const [dateOptions, setDateOptions] = useState<DateOptions | undefined>();
  const [showDateOptions, setShowDateOptions] = useState(false);
  const excludedUserList = group.group_users;

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Not set";

    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View
      className={`w-full pb-4 ${Platform.OS === "web" ? "max-w-[500px]" : ""}`}
    >
      {/* Group Members Card */}
      <View className="w-full bg-gray-900 rounded-xl shadow-md p-4 mb-4">
        <Text className="text-lg font-semibold text-blue-400 mb-3">
          Group Members
        </Text>
        <View className="bg-gray-800 rounded-lg p-3">
          <UserList group={group} />
        </View>
      </View>

      {/* Event Schedule Card */}
      <View className="w-full bg-gray-900 rounded-xl shadow-md p-4 mb-4 overflow-visible">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-blue-400">
            Event Schedule
          </Text>
          <Button
            size="sm"
            onPress={() => setShowDateOptions(!showDateOptions)}
            text={showDateOptions ? "Hide" : "Edit"}
            className="bg-gray-800 rounded-lg"
            textClassName="text-blue-300 font-medium"
            border={false}
          />
        </View>

        {!showDateOptions && dateOptions && (
          <View className="bg-gray-800 rounded-lg p-3 mb-2">
            <View className="mb-1">
              <Text className="text-sm text-gray-400 mb-1">Starts:</Text>
              <Text className="text-base font-medium text-gray-200">
                {formatDate(dateOptions.startDate)}
              </Text>
            </View>
            <View>
              <Text className="text-sm text-gray-400 mb-1">Ends:</Text>
              <Text className="text-base font-medium text-gray-200">
                {formatDate(dateOptions.endDate)}
              </Text>
            </View>
          </View>
        )}

        {!showDateOptions && !dateOptions && (
          <View className="bg-gray-800 rounded-lg p-3 mb-2">
            <Text className="text-base text-gray-400">No schedule set</Text>
          </View>
        )}

        {showDateOptions && (
          <GroupDateOptions
            dateOptions={dateOptions}
            setDateOptions={setDateOptions}
          />
        )}
      </View>

      {/* User Invite Card */}
      <View className="w-full z-50 bg-gray-900 rounded-xl shadow-md p-4 mb-4 overflow-visible">
        <Text className="text-lg font-semibold text-blue-400 mb-3">
          Invite Friends
        </Text>

        <View className="z-40 bg-gray-800 rounded-lg p-3 overflow-visible">
          <UserInviteMultiselect
            placeholderText="Select friends to invite"
            userList={usersToInvite}
            setUserList={setUsersToInvite}
            excludedUserList={excludedUserList}
          />
        </View>
      </View>

      {usersToInvite.length > 0 && (
        <View className="z-10">
          <Button
            border={false}
            size="lg"
            className="w-full bg-blue-600 rounded-lg"
            textClassName="text-white font-medium"
            text="Add New Users"
            onPress={async () => {
              try {
                await inviteUsersToGroup(usersToInvite, group.id);
                setUsersToInvite([]);
                refreshGroups();
              } catch (error) {
                console.error(error);
              }
            }}
          />
        </View>
      )}
    </View>
  );
};

export default ChatSettingsMenu;
