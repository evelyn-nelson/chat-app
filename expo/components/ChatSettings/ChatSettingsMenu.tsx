import {
  Platform,
  Text,
  View,
  Image,
  Pressable,
  TextInput,
  Alert,
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
  PickerImageResult, // Use the consistent type
} from "@/types/types";
import UserList from "./UserList";
import Button from "../Global/Button/Button";
import GroupDateOptions from "../Global/GroupDateOptions/GroupDateOptions";
import Ionicons from "@expo/vector-icons/Ionicons";
// import * as ImagePicker from "expo-image-picker"; // Import expo-image-picker

const ChatSettingsMenu = (props: { group: Group }) => {
  const { group } = props;
  const { user: self, store, refreshGroups, refreshUsers } = useGlobalStore();
  const currentUserIsAdmin = group.admin;

  const { inviteUsersToGroup, updateGroup, getGroups, getUsers } =
    useWebSocket();

  const [isEditing, setIsEditing] = useState(false);

  // Editable fields state
  const [editableName, setEditableName] = useState(group.name);
  const [editableDescription, setEditableDescription] = useState(
    group.description || ""
  );
  const [editableLocation, setEditableLocation] = useState(
    group.location || ""
  );

  // Image related state:
  // currentImageUriForPreview: URI shown in the <Image> tag (can be original URL or new local URI)
  // newImageFileToUpload: Holds {uri, base64?} if a NEW image is picked from gallery
  // imageMarkedForRemoval: Flag to indicate if the user wants to remove the existing image
  const [currentImageUriForPreview, setCurrentImageUriForPreview] = useState<
    string | null
  >(group.image_url || null);
  const [newImageFileToUpload, setNewImageFileToUpload] =
    useState<PickerImageResult | null>(null);
  const [imageMarkedForRemoval, setImageMarkedForRemoval] =
    useState<boolean>(false);

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

  // Reset fields when group prop changes or when exiting edit mode
  useEffect(() => {
    if (!isEditing || group) {
      setEditableName(group.name);
      setEditableDescription(group.description || "");
      setEditableLocation(group.location || "");
      setCurrentImageUriForPreview(group.image_url || null);
      setNewImageFileToUpload(null);
      setImageMarkedForRemoval(false);
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

  const fetchAndRefreshUsers = async () => {
    try {
      const updatedUsers = await getUsers();
      await store.saveUsers(updatedUsers);
      refreshUsers();
    } catch (error) {
      console.error("Failed to fetch and refresh groups:", error);
    }
  };

  // --- Re-use or import your image upload function ---
  async function uploadImageAsync(
    uri: string,
    base64?: string
  ): Promise<string | null> {
    console.log("Attempting to upload image from URI:", uri);
    // (Same implementation as in ChatCreateMenu or a shared utility)
    // For testing, simulate an upload:
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUrl = `https://picsum.photos/seed/${Date.now()}/200/200`;
        console.log("Simulated upload, returning URL:", mockUrl);
        resolve(mockUrl);
        // resolve(null); // Simulate upload failure
      }, 1500);
    });
  }
  // --- End of uploadImageAsync ---

  const handleSaveChanges = async () => {
    setIsLoadingUpdate(true);

    const payload: UpdateGroupParams = {};
    let hasChanges = false;
    let finalImageUrlForPayload: string | null | undefined = group.image_url; // Start with original

    // 1. Handle Image Update/Removal
    if (imageMarkedForRemoval) {
      finalImageUrlForPayload = null;
    } else if (newImageFileToUpload?.uri) {
      const uploadedUrl = await uploadImageAsync(
        newImageFileToUpload.uri,
        newImageFileToUpload.base64
      );
      if (!uploadedUrl) {
        // Upload failed, uploadImageAsync should have shown an alert.
        setIsLoadingUpdate(false);
        return; // Stop if new image selected but upload failed
      }
      finalImageUrlForPayload = uploadedUrl;
    }

    // Only add image_url to payload if it actually changed from the original
    if (finalImageUrlForPayload !== group.image_url) {
      payload.image_url = finalImageUrlForPayload;
      hasChanges = true;
    }

    // 2. Handle other field updates
    if (editableName.trim() !== group.name && editableName.trim() !== "") {
      payload.name = editableName.trim();
      hasChanges = true;
    }
    if (editableDescription !== (group.description || "")) {
      payload.description = editableDescription;
      hasChanges = true;
    }
    if (editableLocation !== (group.location || "")) {
      payload.location = editableLocation;
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
          Alert.alert(
            "Update Failed",
            "Could not save some changes. Please try again."
          );
        }
      } catch (error) {
        console.error("Error updating group:", error);
        Alert.alert(
          "Error",
          "An unexpected error occurred while saving changes."
        );
      }
    }

    setIsLoadingUpdate(false);
    setIsEditing(false); // Exit edit mode
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
      await fetchAndRefreshUsers();
      setUsersToInvite([]);
    } catch (error) {
      console.error("Error inviting users:", error);
    } finally {
      setIsLoadingInvite(false);
    }
  };

  const handlePickImage = async () => {
    // const permissionResult =
    //   // await ImagePicker.requestMediaLibraryPermissionsAsync();
    // if (permissionResult.granted === false) {
    //   Alert.alert(
    //     "Permission Required",
    //     "Permission to access camera roll is required."
    //   );
    //   return;
    // }
    // try {
    //   const pickerResult = await ImagePicker.launchImageLibraryAsync({
    //     mediaTypes: ImagePicker.MediaTypeOptions.Images,
    //     allowsEditing: true,
    //     aspect: [1, 1],
    //     quality: 0.6,
    //     // base64: true, // If your uploadImageAsync needs it
    //   });
    //   if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
    //     const newImg: PickerImageResult = {
    //       uri: pickerResult.assets[0].uri,
    //       // base64: pickerResult.assets[0].base64,
    //     };
    //     setCurrentImageUriForPreview(newImg.uri); // Update preview
    //     setNewImageFileToUpload(newImg); // Mark new file for upload
    //     setImageMarkedForRemoval(false); // Unmark removal if user picks new image
    //   }
    // } catch (e) {
    //   console.error("Image picker error:", e);
    //   Alert.alert("Image Error", "Could not select image.");
    // }
  };

  const handleRemoveImage = () => {
    setCurrentImageUriForPreview(null); // Clear preview
    setNewImageFileToUpload(null); // No new file to upload
    setImageMarkedForRemoval(true); // Flag for removal on save
  };

  const formatDate = (date: Date | null) => {
    // ... (same as before)
    if (!date) return "Not set";
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ... (renderEditableField, renderDisplayField helpers same as before)
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
      {/* Group Image Display/Edit */}
      <View className="items-center my-4">
        <Pressable
          onPress={
            isEditing && currentUserIsAdmin ? handlePickImage : undefined
          }
          className="relative"
          disabled={!isEditing || !currentUserIsAdmin}
        >
          {currentImageUriForPreview ? (
            <Image
              source={{ uri: currentImageUriForPreview }}
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
        {isEditing &&
          currentUserIsAdmin &&
          currentImageUriForPreview && ( // Show remove button if there's an image to remove
            <Button
              size="xs"
              text="Remove Image"
              onPress={handleRemoveImage}
              variant="secondary"
              className="mt-2 bg-red-700/30"
              textClassName="text-red-400"
            />
          )}
      </View>

      {/* Admin Edit Controls */}
      {currentUserIsAdmin && (
        <View className="flex-row justify-end mb-4 px-4">
          {isEditing ? (
            <>
              <Button
                text="Cancel"
                onPress={() => setIsEditing(false)} // useEffect handles reset
                size="sm"
                variant="secondary"
                className="mr-2"
              />
              <Button
                text={isLoadingUpdate ? "Saving..." : "Save Changes"}
                onPress={handleSaveChanges}
                disabled={isLoadingUpdate}
                size="sm"
                variant="primary"
              />
            </>
          ) : (
            <Button
              text="Edit Group"
              onPress={() => setIsEditing(true)}
              size="sm"
              variant="primary"
              leftIcon={<Ionicons name="pencil" size={16} color="white" />}
            />
          )}
        </View>
      )}

      {/* Group Details Card */}
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
          : renderDisplayField("Description", group.description)}

        {isEditing && currentUserIsAdmin
          ? renderEditableField(
              "Location",
              editableLocation,
              setEditableLocation,
              "Enter location (optional)"
            )
          : renderDisplayField("Location", group.location)}
      </View>

      {/* Event Schedule Card */}
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

      {/* Group Members Card */}
      <View className="w-full bg-gray-900 rounded-xl shadow-md p-4 mb-4">
        <Text className="text-lg font-semibold text-blue-400 mb-3">
          {group.group_users.length}{" "}
          {group.group_users.length === 1 ? "Member" : "Members"}
        </Text>
        <View className="bg-gray-800 rounded-lg p-1">
          <UserList group={group} currentUserIsAdmin={currentUserIsAdmin} />
        </View>
      </View>

      {/* User Invite Card */}
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
