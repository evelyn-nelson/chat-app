import {
  DateOptions,
  PickerImageResult, // Use the type from your types.ts
} from "@/types/types";
import { useState } from "react";
import {
  Text,
  TextInput,
  View,
  Image,
  Pressable,
  Alert, // For showing errors or messages
} from "react-native";
import { useWebSocket } from "../../context/WebSocketContext";
import { router } from "expo-router";
import { useGlobalStore } from "../../context/GlobalStoreContext";
import UserInviteMultiselect from "../../Global/Multiselect/UserInviteMultiselect";
import Button from "@/components/Global/Button/Button";
import GroupDateOptions from "@/components/Global/GroupDateOptions/GroupDateOptions";
import Ionicons from "@expo/vector-icons/Ionicons";
// import * as ImagePicker from "expo-image-picker"; // Import expo-image-picker

export const ChatCreateMenu = ({ onSubmit }: { onSubmit: () => void }) => {
  const { user: self, store, refreshGroups } = useGlobalStore();
  const [groupName, setGroupName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<PickerImageResult | null>(
    null
  );

  const [usersToInvite, setUsersToInvite] = useState<string[]>([]);
  const [dateOptions, setDateOptions] = useState<DateOptions>({
    startTime: null,
    endTime: null,
  });

  const { createGroup, inviteUsersToGroup, getGroups } = useWebSocket();
  const [isLoading, setIsLoading] = useState(false);
  const [showDateOptions, setShowDateOptions] = useState(false);
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);

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

  // --- Placeholder for image upload function ---
  async function uploadImageAsync(
    uri: string,
    base64?: string
  ): Promise<string | null> {
    console.log("Attempting to upload image from URI:", uri);
    // Example using FormData (conceptual):
    // const filename = uri.split('/').pop();
    // const match = /\.(\w+)$/.exec(filename!);
    // const type = match ? `image/${match[1]}` : `image`;
    // const formData = new FormData();
    // formData.append('file', { uri, name: filename, type } as any);
    // try {
    //   const response = await fetch('YOUR_UPLOAD_ENDPOINT', {
    //     method: 'POST',
    //     body: formData,
    //     headers: {
    //       'Content-Type': 'multipart/form-data',
    //       // Add any auth headers if needed
    //     },
    //   });
    //   if (!response.ok) {
    //     throw new Error('Image upload failed');
    //   }
    //   const result = await response.json();
    //   return result.imageUrl; // Assuming your server returns { imageUrl: "..." }
    // } catch (e) {
    //   console.error("Upload error:", e);
    //   Alert.alert("Upload Failed", "Could not upload the image. Please try again.");
    //   return null;
    // }

    // For testing, simulate an upload and return a placeholder URL
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUrl = `https://picsum.photos/seed/${Date.now()}/200/200`; // Placeholder
        console.log("Simulated upload, returning URL:", mockUrl);
        resolve(mockUrl);
        // resolve(null); // Simulate upload failure
      }, 1500);
    });
  }
  // --- End of placeholder ---

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !dateOptions.startTime || !dateOptions.endTime) {
      Alert.alert(
        "Missing Information",
        "Please provide a group name and set the event schedule."
      );
      return;
    }

    setIsLoading(true);
    let finalImageUrl: string | null = null;

    if (selectedImage?.uri) {
      const uploadedUrl = await uploadImageAsync(
        selectedImage.uri,
        selectedImage.base64
      );
      if (!uploadedUrl) {
        // Upload failed, uploadImageAsync should have shown an alert.
        setIsLoading(false);
        return; // Stop group creation if image upload fails
      }
      finalImageUrl = uploadedUrl;
    }

    try {
      const createdGroup = await createGroup(
        groupName,
        dateOptions.startTime,
        dateOptions.endTime
        // description,
        // location,
        // finalImageUrl // Pass the uploaded image URL
      );

      if (createdGroup) {
        if (usersToInvite.length > 0) {
          await inviteUsersToGroup(usersToInvite, createdGroup.id);
        }

        await fetchAndRefreshGroups();

        setGroupName("");
        setDescription("");
        setLocation("");
        setSelectedImage(null);
        setUsersToInvite([]);
        setDateOptions({ startTime: null, endTime: null });

        onSubmit();
        router.push(`/groups/${createdGroup.id}`);
      } else {
        console.error("Group creation returned undefined.");
        Alert.alert(
          "Creation Failed",
          "Could not create the group. Please try again."
        );
      }
    } catch (error) {
      console.error("Error during group creation process:", error);
      Alert.alert(
        "Error",
        "An unexpected error occurred during group creation."
      );
    } finally {
      setIsLoading(false);
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

  const handlePickImage = async () => {
    // const permissionResult =
    //   await ImagePicker.requestMediaLibraryPermissionsAsync();
    // if (permissionResult.granted === false) {
    //   Alert.alert(
    //     "Permission Required",
    //     "Permission to access camera roll is required to select an image."
    //   );
    //   return;
    // }
    // try {
    //   const pickerResult = await ImagePicker.launchImageLibraryAsync({
    //     mediaTypes: ImagePicker.MediaTypeOptions.Images,
    //     allowsEditing: true,
    //     aspect: [1, 1],
    //     quality: 0.6, // Adjust quality as needed
    //     // base64: true, // Include if your uploadImageAsync function will use base64
    //   });
    //   if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
    //     setSelectedImage({
    //       uri: pickerResult.assets[0].uri,
    //       // base64: pickerResult.assets[0].base64, // Store if you requested it
    //     });
    //   }
    // } catch (e) {
    //   console.error("Image picker error:", e);
    //   Alert.alert("Image Error", "Could not select image.");
    // }
  };

  const handleRemoveImage = () => {
    // setSelectedImage(null);
  };

  return (
    <View className="w-full">
      {/* Group Image Picker */}
      <View className="items-center my-4">
        <Pressable onPress={handlePickImage} className="relative">
          {selectedImage?.uri ? (
            <Image
              source={{ uri: selectedImage.uri }} // Preview using local URI
              className="w-28 h-28 rounded-full bg-gray-700 border-2 border-gray-600"
            />
          ) : (
            <View className="w-28 h-28 rounded-full bg-gray-700 items-center justify-center border-2 border-gray-600">
              <Ionicons name="camera-outline" size={48} color="#9CA3AF" />
            </View>
          )}
          <View className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full border-2 border-gray-800">
            <Ionicons name="pencil" size={16} color="white" />
          </View>
        </Pressable>
        {selectedImage?.uri && (
          <Button
            size="xs"
            text="Remove Image"
            onPress={handleRemoveImage}
            variant="secondary" // Or a custom "danger" variant
            className="mt-2 bg-red-700/30"
            textClassName="text-red-400"
          />
        )}
      </View>

      {/* Group Name Card */}
      <View className="w-full bg-gray-900 rounded-xl shadow-md p-4 mb-4">
        <Text className="text-lg font-semibold text-blue-400 mb-3">
          Group Name *
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
      <View className="w-full bg-gray-900 rounded-xl shadow-md p-4 mb-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-blue-400">
            Event Schedule *
          </Text>
          <Button
            size="sm"
            onPress={() => setShowDateOptions(!showDateOptions)}
            text={showDateOptions ? "Hide" : "Edit"}
            variant="secondary"
          />
        </View>
        {!showDateOptions && (dateOptions.startTime || dateOptions.endTime) && (
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
        {!showDateOptions && !dateOptions.startTime && !dateOptions.endTime && (
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

      {/* Optional Details Card */}
      <View className="w-full bg-gray-900 rounded-xl shadow-md p-4 mb-4">
        <Text className="text-lg font-semibold text-blue-400 mb-3">
          Optional Details
        </Text>
        <View className="mb-3">
          <Pressable
            onPress={() => setShowDescriptionInput(!showDescriptionInput)}
            className="flex-row justify-between items-center p-3 bg-gray-800 rounded-lg mb-2 active:bg-gray-700"
          >
            <Text className="text-base text-gray-300">Description</Text>
            <Text className="text-blue-400">
              {showDescriptionInput ? "Hide" : description ? "Edit" : "Add"}
            </Text>
          </Pressable>
          {showDescriptionInput && (
            <TextInput
              className="bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 w-full h-24"
              onChangeText={setDescription}
              value={description}
              placeholder="Add a description (optional)"
              placeholderTextColor="#6B7280"
              multiline
              textAlignVertical="top"
            />
          )}
          {!showDescriptionInput && description ? (
            <Text className="text-gray-400 px-3 py-1 text-sm italic">
              {description}
            </Text>
          ) : null}
        </View>
        <View>
          <Pressable
            onPress={() => setShowLocationInput(!showLocationInput)}
            className="flex-row justify-between items-center p-3 bg-gray-800 rounded-lg mb-2 active:bg-gray-700"
          >
            <Text className="text-base text-gray-300">Location</Text>
            <Text className="text-blue-400">
              {showLocationInput ? "Hide" : location ? "Edit" : "Add"}
            </Text>
          </Pressable>
          {showLocationInput && (
            <TextInput
              className="bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 w-full"
              onChangeText={setLocation}
              value={location}
              placeholder="Add a location (optional)"
              placeholderTextColor="#6B7280"
            />
          )}
          {!showLocationInput && location ? (
            <Text className="text-gray-400 px-3 py-1 text-sm italic">
              {location}
            </Text>
          ) : null}
        </View>
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

      {/* Create Button */}
      <View className="z-10 mb-4">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
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
