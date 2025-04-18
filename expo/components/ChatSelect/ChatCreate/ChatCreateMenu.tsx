import { DateOptions } from "@/types/types";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useWebSocket } from "../../context/WebSocketContext";
import { router } from "expo-router";
import { useGlobalStore } from "../../context/GlobalStoreContext";
import UserInviteMultiselect from "../../Global/Multiselect/UserInviteMultiselect";
import Button from "@/components/Global/Button/Button";
import GroupDateOptions from "@/components/Global/GroupDateOptions/GroupDateOptions";

export const ChatCreateMenu = ({ onSubmit }: { onSubmit: () => void }) => {
  const { user: self, store, refreshGroups } = useGlobalStore();
  const [groupName, setGroupName] = useState<string>("");
  const [usersToInvite, setUsersToInvite] = useState<string[]>([]);
  const [dateOptions, setDateOptions] = useState<DateOptions>({
    startTime: null,
    endTime: null,
  });
  const { createGroup, inviteUsersToGroup, getGroups } = useWebSocket();
  const [isLoading, setIsLoading] = useState(false);
  const [showDateOptions, setShowDateOptions] = useState(false);

  if (!self) {
    return <View></View>;
  }

  const fetchAndRefreshGroups = async () => {
    try {
      const updatedGroups = await getGroups();
      await store.saveGroups(updatedGroups);
      refreshGroups();
    } catch (error) {
      console.error("Failed to fetch and refresh groups:", error);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !dateOptions.startTime || !dateOptions.endTime)
      return;

    setIsLoading(true);
    let createdGroup = null; // Keep track of the created group

    try {
      createdGroup = await createGroup(
        groupName,
        dateOptions.startTime,
        dateOptions.endTime
      );

      if (createdGroup) {
        if (usersToInvite.length > 0) {
          await inviteUsersToGroup(usersToInvite, createdGroup.id);
        }

        await fetchAndRefreshGroups();

        setGroupName("");
        setUsersToInvite([]);
        setDateOptions({ startTime: null, endTime: null });

        onSubmit();

        router.push(`/groups/${createdGroup.id}`);
      } else {
        console.error("Group creation returned undefined.");
      }
    } catch (error) {
      console.error("Error during group creation process:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
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

  return (
    <View className="w-full pb-4">
      <View className="w-full bg-gray-900 rounded-xl shadow-md p-4 mb-4 overflow-visible">
        <Text className="text-lg font-semibold text-blue-400 mb-3">
          Group Name
        </Text>
        <TextInput
          className="bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 w-full"
          onChangeText={setGroupName}
          value={groupName}
          placeholder="Enter group name"
          placeholderTextColor="#6B7280"
        />
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
      <View className="w-full z-50 bg-gray-900 rounded-xl shadow-md p-4 mb-4 overflow-visible">
        <Text className="text-lg font-semibold text-blue-400 mb-3">
          Invite Friends
        </Text>

        <View className="z-40 bg-gray-800 rounded-lg p-3 overflow-visible">
          <UserInviteMultiselect
            placeholderText="Select friends to invite"
            userList={usersToInvite}
            setUserList={setUsersToInvite}
            excludedUserList={[self]}
          />
        </View>
      </View>

      <View className="z-10">
        <Button
          border={false}
          size="lg"
          className="w-full bg-blue-600 rounded-lg"
          textClassName="text-white font-medium"
          text={isLoading ? "Creating..." : "Create Group"}
          onPress={handleCreateGroup}
          disabled={
            isLoading ||
            !groupName.trim() ||
            !dateOptions.startTime ||
            !dateOptions.endTime
          }
        />
      </View>
    </View>
  );
};
