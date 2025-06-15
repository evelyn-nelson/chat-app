import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";

import { useWebSocket } from "@/components/context/WebSocketContext";
import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import http from "@/util/custom-axios";
import {
  encryptAndPrepareMessageForSending,
  encryptImageFile,
  createImageMessagePayload,
  readImageAsBytes,
} from "@/services/encryptionService";
import { RecipientDevicePublicKey } from "@/types/types";

interface UseSendImageReturn {
  sendImage: (
    imageAsset: ImagePicker.ImagePickerAsset,
    groupId: string,
    recipientUserIds: string[]
  ) => Promise<void>;
  isSendingImage: boolean;
  imageSendError: string | null;
}

const baseURL = `${process.env.EXPO_PUBLIC_HOST}/images`;

export const useSendImage = (): UseSendImageReturn => {
  const [isSendingImage, setIsSendingImage] = useState(false);
  const [imageSendError, setImageSendError] = useState<string | null>(null);

  const { sendMessage: sendPacketOverSocket } = useWebSocket();
  const { user: currentUser, getDeviceKeysForUser } = useGlobalStore();

  const sendImage = useCallback(
    async (
      imageAsset: ImagePicker.ImagePickerAsset,
      groupId: string,
      recipientUserIds: string[]
    ): Promise<void> => {
      setIsSendingImage(true);
      setImageSendError(null);

      if (!currentUser) {
        const errorMsg = "User not authenticated. Cannot send image.";
        setImageSendError(errorMsg);
        setIsSendingImage(false);
        return;
      }

      try {
        const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

        if (!imageAsset.fileSize) {
          throw new Error("Could not determine image size.");
        }
        if (imageAsset.fileSize > MAX_FILE_SIZE_BYTES) {
          throw new Error(
            `Image is too large. Please select a file smaller than 5 MB.`
          );
        }

        const recipientDevicePublicKeys: RecipientDevicePublicKey[] = [];
        for (const userId of recipientUserIds) {
          const keys = getDeviceKeysForUser(userId);
          if (keys && keys.length > 0) {
            recipientDevicePublicKeys.push(...keys);
          } else {
            console.warn(
              `No device keys found for recipient user ${userId}. They may not receive the message.`
            );
          }
        }
        if (recipientDevicePublicKeys.length === 0) {
          throw new Error("No valid recipient device keys found.");
        }

        const imageBytes = await readImageAsBytes(imageAsset.uri);
        const encryptionResult = await encryptImageFile(imageBytes);
        if (!encryptionResult) {
          throw new Error("Failed to encrypt the image file.");
        }
        const { encryptedBlob, imageKey, imageNonce } = encryptionResult;

        if (encryptedBlob.length > MAX_FILE_SIZE_BYTES) {
          throw new Error(
            `Encrypted image is too large to upload (size: ${encryptedBlob.length} bytes).`
          );
        }

        const presignResponse = await http.post(`${baseURL}/presign-upload`, {
          filename: imageAsset.uri.split("/").pop() || "upload.jpg",
          groupId: groupId,
          size: encryptedBlob.length,
        });
        const { uploadUrl, objectKey } = presignResponse.data;

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: encryptedBlob,
        });
        if (!uploadResponse.ok) {
          throw new Error(`S3 Upload Failed: ${await uploadResponse.text()}`);
        }

        const plaintextPayload = createImageMessagePayload(
          objectKey,
          imageAsset.mimeType ?? "image/jpeg",
          imageKey,
          imageNonce,
          { width: imageAsset.width, height: imageAsset.height }
        );

        const rawMessagePayload = await encryptAndPrepareMessageForSending(
          plaintextPayload,
          groupId,
          recipientDevicePublicKeys,
          "image"
        );
        if (!rawMessagePayload) {
          throw new Error("Failed to encrypt the final image message payload.");
        }

        sendPacketOverSocket(rawMessagePayload);
      } catch (error: any) {
        console.error("Error in sendImage process:", error);
        setImageSendError(
          error.message || "An unexpected error occurred while sending image."
        );
      } finally {
        setIsSendingImage(false);
      }
    },
    [currentUser, getDeviceKeysForUser, sendPacketOverSocket]
  );

  return {
    sendImage,
    isSendingImage,
    imageSendError,
  };
};
