import {
  Platform,
  Text,
  View,
  Image,
  Pressable,
  TextInput,
} from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import UserInviteMultiselect from "../Global/Multiselect/UserInviteMultiselect";
import { useWebSocket } from "../context/WebSocketContext";
import { useGlobalStore } from "../context/GlobalStoreContext";
import {
  DateOptions,
  Group,
  GroupUser,
  UpdateGroupParams,
} from "@/types/types";
import UserList from "./UserList";
import Button from "../Global/Button/Button"; // Your Button component
import GroupDateOptions from "../Global/GroupDateOptions/GroupDateOptions";
import Ionicons from "@expo/vector-icons/Ionicons";
// import * as ImagePicker from 'expo-image-picker';

type PickerResultImage = {
  uri: string;
  base64?: string;
};

const ChatSettingsMenu = (props: { group: Group }) => {
  const { group } = props;
  const { user: self, store, refreshGroups } = useGlobalStore();
  const currentUserIsAdmin = group.admin;

  const { inviteUsersToGroup, updateGroup, getGroups } = useWebSocket();

  const [isEditing, setIsEditing] = useState(false);

  const [editableName, setEditableName] = useState(group.name);
  const [editableDescription, setEditableDescription] = useState(
    group.description || ""
  );
  const [editableLocation, setEditableLocation] = useState(
    group.location || ""
  );
  const [currentImageUri, setCurrentImageUri] = useState<string | null>(
    group.image_url || null
  );
  const [newImageFileForUpload, setNewImageFileForUpload] =
    useState<PickerResultImage | null>(null);

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

  const [usersToInvite, setUsersToInvite] = useState<string[]>([]);
  const excludedUserList: GroupUser[] = group.group_users;

  const [isLoadingUpdate, setIsLoadingUpdate] = useState(false);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);

  useEffect(() => {
    if (!isEditing || group) {
      setEditableName(group.name);
      // Assuming group.description, group.location, group.image_url will be added to your Group type
      setEditableDescription(group.description || "");
      setEditableLocation(group.location || "");
      setCurrentImageUri(group.image_url || null);
      setNewImageFileForUpload(null);
      setDateOptions({
        startTime: parseDate(group.start_time),
        endTime: parseDate(group.end_time),
      });
    }
  }, [group, isEditing, parseDate]);

  const fetchAndRefreshGroups = async () => {
    try {
      const updatedGroups = await getGroups();
      await store.saveGroups(updatedGroups);
      refreshGroups();
    } catch (error) {
      console.error("Failed to fetch and refresh groups:", error);
    }
  };

  const handleSaveChanges = async () => {
    setIsLoadingUpdate(true);

    // Ensure UpdateGroupParams will include description, location, image_url
    const payload: UpdateGroupParams = {};
    let hasChanges = false;

    let finalImageUrl: string | null | undefined = group.image_url;

    if (newImageFileForUpload) {
      if (newImageFileForUpload.uri === "REMOVE_IMAGE_MARKER") {
        finalImageUrl = null;
      } else {
        console.warn(
          "Placeholder: Image upload logic needed. Using local URI for now.",
          newImageFileForUpload.uri
        );
        finalImageUrl = newImageFileForUpload.uri; // Replace with actual URL after upload
      }
    }

    // *** FIX FOR TYPESCRIPT ERROR ***
    // If your UpdateGroupParams.image_url is 'string | undefined', convert null to undefined.
    // If you change UpdateGroupParams.image_url to 'string | null | undefined',
    // you can directly assign: payload.image_url = finalImageUrl;
    payload.image_url = finalImageUrl === null ? undefined : finalImageUrl;
    if (payload.image_url !== group.image_url) {
      // Check if it actually changed
      hasChanges = true;
    }
    // *******************************

    if (editableName.trim() !== group.name && editableName.trim() !== "") {
      payload.name = editableName.trim();
      hasChanges = true;
    }
    if (editableDescription !== (group.description || "")) {
      payload.description = editableDescription; // Assumes description in UpdateGroupParams
      hasChanges = true;
    }
    if (editableLocation !== (group.location || "")) {
      payload.location = editableLocation; // Assumes location in UpdateGroupParams
      hasChanges = true;
    }

    const groupStartTime = parseDate(group.start_time);
    const groupEndTime = parseDate(group.end_time);
    if (
      dateOptions.startTime?.toISOString() !== groupStartTime?.toISOString() &&
      dateOptions.startTime !== null
    ) {
      payload.start_time = dateOptions.startTime.toISOString();
      hasChanges = true;
    }
    if (
      dateOptions.endTime?.toISOString() !== groupEndTime?.toISOString() &&
      dateOptions.endTime !== null
    ) {
      payload.end_time = dateOptions.endTime.toISOString();
      hasChanges = true;
    }

    if (hasChanges) {
      try {
        const updatedGroupData = await updateGroup(group.id, payload);
        if (updatedGroupData) {
          await fetchAndRefreshGroups();
        } else {
          console.error("Group update returned undefined.");
        }
      } catch (error) {
        console.error("Error updating group:", error);
      }
    }

    setIsLoadingUpdate(false);
    setIsEditing(false);
  };

  const handleInviteUsers = async () => {
    if (usersToInvite.length === 0) return;
    setIsLoadingInvite(true);
    try {
      await inviteUsersToGroup(
        usersToInvite.map((id) => id.toString()),
        group.id
      );
      await fetchAndRefreshGroups();
      setUsersToInvite([]);
    } catch (error) {
      console.error("Error inviting users:", error);
    } finally {
      setIsLoadingInvite(false);
    }
  };

  const handlePickImage = async () => {
    console.log("Image picker to be implemented for settings");
    // Placeholder for image picker logic
    // const newImg = { uri: "https://picsum.photos/seed/newgroupimage/200" };
    // setCurrentImageUri(newImg.uri);
    // setNewImageFileForUpload(newImg);
  };

  const handleRemoveImage = () => {
    setCurrentImageUri(null);
    setNewImageFileForUpload({ uri: "REMOVE_IMAGE_MARKER" });
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

  const renderEditableField = (
    label: string,
    value: string,
    setter: (text: string) => void,
    placeholder: string,
    multiline = false,
    required = false
  ) => (
    <View className="mb-3">
      <Text className="text-sm text-gray-400 mb-1">
        {label}
        {required && " *"}
      </Text>
      <TextInput
        className={`bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 w-full ${
          multiline ? "h-24" : ""
        }`}
        value={value}
        onChangeText={setter}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "auto"}
      />
    </View>
  );

  const renderDisplayField = (
    label: string,
    value: string | null | undefined
  ) => (
    <View className="mb-3">
      <Text className="text-sm text-gray-400 mb-1">{label}</Text>
      <Text className="text-base text-gray-200">
        {value || <Text className="italic text-gray-500">Not set</Text>}
      </Text>
    </View>
  );

  return (
    <View
      className={`w-full pb-4 ${Platform.OS === "web" ? "max-w-[500px]" : ""}`}
    >
      <View className="items-center my-4">
        <Pressable
          onPress={
            isEditing && currentUserIsAdmin ? handlePickImage : undefined
          }
          className="relative"
          disabled={!isEditing || !currentUserIsAdmin}
        >
          {currentImageUri ? (
            <Image
              source={{ uri: currentImageUri }}
              className="w-28 h-28 rounded-full bg-gray-700 border-2 border-gray-600"
            />
          ) : (
            <View className="w-28 h-28 rounded-full bg-gray-700 items-center justify-center border-2 border-gray-600">
              <Ionicons name="image-outline" size={48} color="#9CA3AF" />
            </View>
          )}
          {isEditing && currentUserIsAdmin && (
            <View className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full border-2 border-gray-800">
              <Ionicons name="pencil" size={16} color="white" />
            </View>
          )}
        </Pressable>
        {isEditing && currentUserIsAdmin && currentImageUri && (
          <Button
            text="Remove Image"
            onPress={handleRemoveImage}
            size="xs"
            variant="secondary" // Example variant
            className="mt-2 bg-red-700/80" // This will override variant bg
            textClassName="text-white" // This will override variant text color
          />
        )}
      </View>

      {currentUserIsAdmin && (
        <View className="flex-row justify-end mb-4 px-4">
          {isEditing ? (
            <>
              <Button
                text="Cancel"
                onPress={() => setIsEditing(false)}
                size="sm"
                variant="secondary" // Use your button variants
                className="mr-2"
                // textClassName="text-white" // Variant handles text color
              />
              <Button
                text={isLoadingUpdate ? "Saving..." : "Save Changes"}
                onPress={handleSaveChanges}
                disabled={isLoadingUpdate}
                size="sm"
                variant="primary"
                // textClassName="text-white" // Variant handles text color
              />
            </>
          ) : (
            <Button
              text="Edit Group"
              onPress={() => setIsEditing(true)}
              size="sm"
              variant="primary" // Use your button variants
              // textClassName="text-white" // Variant handles text color
              leftIcon={<Ionicons name="pencil" size={16} color="white" />} // *** USE leftIcon ***
            />
          )}
        </View>
      )}

      <View className="w-full bg-gray-900 rounded-xl shadow-md p-4 mb-4">
        <Text className="text-lg font-semibold text-blue-400 mb-3">
          Group Details
        </Text>
        {isEditing && currentUserIsAdmin
          ? renderEditableField(
              "Group Name",
              editableName,
              setEditableName,
              "Enter group name",
              false,
              true
            )
          : renderDisplayField("Group Name", group.name)}

        {isEditing && currentUserIsAdmin
          ? renderEditableField(
              "Description",
              editableDescription,
              setEditableDescription,
              "Enter description (optional)",
              true
            )
          : renderDisplayField(
              "Description",
              group.description /* Assumes type updated */
            )}

        {isEditing && currentUserIsAdmin
          ? renderEditableField(
              "Location",
              editableLocation,
              setEditableLocation,
              "Enter location (optional)"
            )
          : renderDisplayField(
              "Location",
              group.location /* Assumes type updated */
            )}
      </View>

      <View className="w-full bg-gray-900 rounded-xl shadow-md p-4 mb-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-blue-400">
            Event Schedule *
          </Text>
        </View>
        {isEditing && currentUserIsAdmin ? (
          <GroupDateOptions
            dateOptions={dateOptions}
            setDateOptions={setDateOptions}
          />
        ) : (
          <View className="bg-gray-800 rounded-lg p-3">
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
      </View>

      <View className="w-full bg-gray-900 rounded-xl shadow-md p-4 mb-4">
        <Text className="text-lg font-semibold text-blue-400 mb-3">
          {group.group_users.length}{" "}
          {group.group_users.length === 1 ? "Member" : "Members"}
        </Text>
        <View className="bg-gray-800 rounded-lg p-1">
          <UserList group={group} currentUserIsAdmin={currentUserIsAdmin} />
        </View>
      </View>

      {currentUserIsAdmin && (
        <View className="w-full z-30 bg-gray-900 rounded-xl shadow-md p-4 mb-4 overflow-visible">
          <Text className="text-lg font-semibold text-blue-400 mb-3">
            Invite Friends
          </Text>
          <View className="z-20 bg-gray-800 rounded-lg p-3 overflow-visible">
            <UserInviteMultiselect
              placeholderText="Select friends to invite"
              userList={usersToInvite}
              setUserList={setUsersToInvite}
              excludedUserList={excludedUserList}
            />
          </View>
          {usersToInvite.length > 0 && (
            <View className="mt-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-green-600"
                textClassName="text-white font-medium"
                text={isLoadingInvite ? "Inviting..." : "Add New Users"}
                onPress={handleInviteUsers}
                disabled={isLoadingInvite}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default ChatSettingsMenu;
