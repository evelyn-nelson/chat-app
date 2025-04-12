import { Platform, Text, View } from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import UserInviteMultiselect from "../Global/Multiselect/UserInviteMultiselect";
import { useWebSocket } from "../context/WebSocketContext";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { DateOptions, Group } from "@/types/types";
import UserList from "./UserList";
import Button from "../Global/Button/Button";
import GroupDateOptions from "../Global/GroupDateOptions/GroupDateOptions";

const ChatSettingsMenu = (props: { group: Group }) => {
  const { group } = props;
  const { user: self, store } = useGlobalStore();
  const user = group.group_users.find((member) => member.id === self?.id);
  const { inviteUsersToGroup, updateGroup, getGroups } = useWebSocket();
  const [isLoadingUpdate, setIsLoadingUpdate] = useState(false);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);
  const { refreshGroups } = useGlobalStore();
  const [usersToInvite, setUsersToInvite] = useState<string[]>([]);
  const parseDate = useCallback(
    (dateString: string | null | undefined): Date | null => {
      if (!dateString) return null;
      const timestamp = Date.parse(dateString);
      return isNaN(timestamp) ? null : new Date(timestamp);
    },
    []
  );

  const [dateOptions, setDateOptions] = useState<DateOptions>({
    startTime: parseDate(group.start_time),
    endTime: parseDate(group.end_time),
  });
  const [showDateOptions, setShowDateOptions] = useState(false);
  const excludedUserList = group.group_users;

  const [hasDateChanges, setHasDateChanges] = useState(false);

  useEffect(() => {
    const groupStartTime = parseDate(group.start_time);
    const groupEndTime = parseDate(group.end_time);

    const startTimeChanged =
      (dateOptions.startTime ?? null)?.getTime() !==
      (groupStartTime ?? null)?.getTime();
    const endTimeChanged =
      (dateOptions.endTime ?? null)?.getTime() !==
      (groupEndTime ?? null)?.getTime();

    setHasDateChanges(startTimeChanged || endTimeChanged);
  }, [dateOptions, group.start_time, group.end_time, parseDate]);

  const fetchAndRefreshGroups = async () => {
    try {
      const updatedGroups = await getGroups();
      await store.saveGroups(updatedGroups);
      refreshGroups();
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error("Failed to fetch and refresh groups:", error);
    }
  };

  const handleUpdateGroup = async () => {
    if (!hasDateChanges || !dateOptions.startTime || !dateOptions.endTime) {
      return;
    }

    setIsLoadingUpdate(true);
    setShowDateOptions(false);
    try {
      const updatedGroup = await updateGroup(group.id, {
        start_time: dateOptions.startTime.toISOString(),
        end_time: dateOptions.endTime.toISOString(),
      });

      if (updatedGroup) {
        await fetchAndRefreshGroups();
      } else {
        console.error("Group update returned undefined.");
      }
    } catch (error) {
      console.error("Error updating group:", error);
    } finally {
      setIsLoadingUpdate(false);
    }
  };
  const handleInviteUsers = async () => {
    if (usersToInvite.length === 0) return;

    setIsLoadingInvite(true);
    try {
      await inviteUsersToGroup(usersToInvite, group.id);

      await fetchAndRefreshGroups();

      setUsersToInvite([]);
    } catch (error) {
      console.error("Error inviting users:", error);
    } finally {
      setIsLoadingInvite(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Not set";

    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isUpdateDisabled =
    isLoadingUpdate ||
    !hasDateChanges ||
    !dateOptions.startTime ||
    !dateOptions.endTime;

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
                {formatDate(dateOptions.startTime)}
              </Text>
            </View>
            <View>
              <Text className="text-sm text-gray-400 mb-1">Ends:</Text>
              <Text className="text-base font-medium text-gray-200">
                {formatDate(dateOptions.endTime)}
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
      {user?.admin && (
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
      )}

      {usersToInvite.length > 0 && user?.admin && (
        <View className="z-10 mb-3">
          <Button
            border={false}
            size="lg"
            className="w-full bg-blue-600 rounded-lg" // Changed color for distinction
            textClassName="text-white font-medium"
            text={isLoadingInvite ? "Inviting..." : "Add New Users"}
            onPress={handleInviteUsers}
            disabled={isLoadingInvite}
          />
        </View>
      )}
      {user?.admin && ( // Only show Update button if user is admin
        <View className="z-10">
          <Button
            border={false}
            size="lg"
            className="w-full bg-blue-600 rounded-lg"
            textClassName="text-white font-medium"
            text={"Update Group"}
            onPress={handleUpdateGroup}
            disabled={isUpdateDisabled}
          />
        </View>
      )}
    </View>
  );
};

export default ChatSettingsMenu;
