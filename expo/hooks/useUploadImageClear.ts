import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";

import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import http from "@/util/custom-axios";
import { base64ToUint8Array } from "@/services/encryptionService";
import { ClearImage, RecipientDevicePublicKey } from "@/types/types";
import { processImage } from "@/services/imageService";
import { useWebSocket } from "@/components/context/WebSocketContext";

interface UseUploadImageReturn {
  uploadImage: (
    imageAsset: ImagePicker.ImagePickerAsset,
    groupId: string
  ) => Promise<ClearImage | undefined>;
  isUploading: boolean;
  imageUploadError: string | null;
}

const baseURL = `${process.env.EXPO_PUBLIC_HOST}/images`;

export const useUploadImageClear = (): UseUploadImageReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const { user: currentUser } = useGlobalStore();

  const uploadImage = useCallback(
    async (
      imageAsset: ImagePicker.ImagePickerAsset,
      groupId: string
    ): Promise<ClearImage | undefined> => {
      setIsUploading(true);
      setImageUploadError(null);

      if (!currentUser) {
        const errorMsg = "User not authenticated. Cannot send image.";
        setImageUploadError(errorMsg);
        setIsUploading(false);
        return;
      }

      try {
        const processedData = await processImage(imageAsset.uri);

        const { normalized, blurhash } = processedData;

        const imageBytes = base64ToUint8Array(normalized.base64);

        const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
        if (imageBytes.length > MAX_FILE_SIZE_BYTES) {
          throw new Error(
            `Image is too large after compression. Max size is 5 MB.`
          );
        }

        const presignResponse = await http.post(`${baseURL}/presign-upload`, {
          filename: imageAsset.uri.split("/").pop() || "upload.jpg",
          groupId: groupId,
          size: imageBytes.length,
        });
        const { uploadUrl, objectKey: imageURL } = presignResponse.data;

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: imageBytes,
        });
        if (!uploadResponse.ok) {
          throw new Error(`S3 Upload Failed: ${await uploadResponse.text()}`);
        }

        return { imageURL, blurhash };
      } catch (error: any) {
        console.error("Error in sendImage process:", error);
        setImageUploadError(
          error.message || "An unexpected error occurred while uploading image."
        );
      } finally {
        setIsUploading(false);
      }
    },
    [currentUser]
  );

  return {
    uploadImage,
    isUploading,
    imageUploadError,
  };
};
