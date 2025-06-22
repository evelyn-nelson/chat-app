import React, { useState } from "react";
import {
  Pressable,
  View,
  TextInput,
  ActivityIndicator,
  Text,
  Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";

import { useGlobalStore } from "../context/GlobalStoreContext";
import { Group } from "@/types/types";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useSendImage } from "@/hooks/useSendImage";

const MessageEntry = ({
  group,
  recipientUserIds,
}: {
  group: Group;
  recipientUserIds: string[];
}) => {
  const { user } = useGlobalStore();
  const { sendMessage, isSending, sendError } = useSendMessage();
  const { sendImage, isSendingImage, imageSendError } = useSendImage();

  const [textContent, setTextContent] = useState<string>("");

  const handleSubmitText = async () => {
    const trimmedContent = textContent.trim();
    if (!trimmedContent || !user) {
      if (!trimmedContent && user) {
        setTextContent("");
      }
      return;
    }

    try {
      await sendMessage(trimmedContent, group.id, recipientUserIds);
      setTextContent("");
    } catch (error) {
      console.error("MessageEntry: Error sending text message:", error);
    }
  };

  const handleAttachImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "You've refused to allow this app to access your photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageAsset = result.assets[0];
      try {
        await sendImage(imageAsset, group.id, recipientUserIds);
      } catch (error) {
        console.error("MessageEntry: Error sending image:", error);
      }
    }
  };

  const isBusy = isSending || isSendingImage;

  return (
    <View>
      <View className="flex-row items-center px-3 py-2">
        <Pressable
          onPress={handleAttachImage}
          disabled={isBusy}
          className="p-2 mr-2"
        >
          {isSendingImage ? (
            <ActivityIndicator size="small" color="#9CA3AF" />
          ) : (
            <Ionicons
              name="add"
              size={24}
              color={isBusy ? "#4B5563" : "#9CA3AF"}
            />
          )}
        </Pressable>

        <View className="flex-1 flex-row items-center bg-gray-800 rounded-full border border-gray-700 px-4">
          <TextInput
            autoCorrect
            spellCheck
            keyboardType="default"
            className="flex-1 text-base text-gray-200 px-0 py-2 outline-0"
            style={{ height: 40 }}
            value={textContent}
            onChangeText={setTextContent}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            blurOnSubmit={false}
            returnKeyType="send"
            onSubmitEditing={handleSubmitText}
            editable={!isBusy}
          />
          <Pressable
            onPress={handleSubmitText}
            disabled={!textContent.trim() || isBusy}
            className="ml-2"
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name="send"
                size={24}
                color={!textContent.trim() || isBusy ? "#4B5563" : "#FFFFFF"}
              />
            )}
          </Pressable>
        </View>
      </View>
      {(sendError || imageSendError) && (
        <Text
          style={{
            color: "red",
            paddingHorizontal: 15,
            paddingBottom: 5,
            fontSize: 12,
          }}
        >
          Error: {sendError || imageSendError}
        </Text>
      )}
    </View>
  );
};

export default MessageEntry;
