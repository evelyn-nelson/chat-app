import { useState, useEffect } from "react";
import * as FileSystem from "expo-file-system";
import http from "@/util/custom-axios";
import { ClearImage, ImageMessageContent } from "@/types/types";
import {
  base64ToUint8Array,
  decryptImageFile,
  saveBytesToLocalFile,
} from "@/services/encryptionService";
import { Image } from "expo-image";

const CACHE_DIR = FileSystem.cacheDirectory + "image_cache/";

const ensureDirExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
};

export const useCachedImageEncrypted = (content: ImageMessageContent) => {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      if (!content?.objectKey) return;

      const filename = content.objectKey.replace(/\//g, "_");
      const cacheUri = `${CACHE_DIR}${filename}`;

      try {
        setIsLoading(true);
        setError(null);
        await ensureDirExists();

        const fileInfo = await FileSystem.getInfoAsync(cacheUri);
        if (fileInfo.exists) {
          setLocalUri(cacheUri);
          return;
        }

        const presignRes = await http.post(
          `${process.env.EXPO_PUBLIC_HOST}/images/presign-download`,
          { objectKey: content.objectKey }
        );
        const { downloadUrl } = presignRes.data;

        const downloadRes = await FileSystem.downloadAsync(
          downloadUrl,
          FileSystem.documentDirectory + "temp_encrypted_image"
        );

        const encryptedBase64 = await FileSystem.readAsStringAsync(
          downloadRes.uri,
          { encoding: FileSystem.EncodingType.Base64 }
        );
        const encryptedBytes = base64ToUint8Array(encryptedBase64);

        const key = base64ToUint8Array(content.decryptionKey);
        const nonce = base64ToUint8Array(content.nonce);
        const decryptedBytes = await decryptImageFile(
          encryptedBytes,
          key,
          nonce
        );

        if (!decryptedBytes) {
          throw new Error("Image decryption failed.");
        }

        const finalUri = await saveBytesToLocalFile(decryptedBytes, cacheUri);
        setLocalUri(finalUri);
      } catch (e: any) {
        console.error("Failed to load or process image:", e);
        setError(e.message || "Could not load image.");
      } finally {
        setIsLoading(false);
        FileSystem.deleteAsync(
          FileSystem.documentDirectory + "temp_encrypted_image",
          { idempotent: true }
        );
      }
    };

    loadImage();
  }, [content]);

  return { localUri, isLoading, error };
};

export const useCachedImageClear = (content: ClearImage) => {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      if (!content?.imageURL) return;

      const filename = content.imageURL.replace(/\//g, "_");
      const cacheUri = `${CACHE_DIR}${filename}`;

      try {
        setIsLoading(true);
        setError(null);
        await ensureDirExists();

        const fileInfo = await FileSystem.getInfoAsync(cacheUri);
        if (fileInfo.exists) {
          setLocalUri(cacheUri);
          return;
        }

        const presignRes = await http.post(
          `${process.env.EXPO_PUBLIC_HOST}/images/presign-download`,
          { objectKey: content.imageURL }
        );
        const { downloadUrl } = presignRes.data;

        const downloadRes = await FileSystem.downloadAsync(
          downloadUrl,
          FileSystem.documentDirectory + "temp_encoded_image"
        );

        const base64Image = await FileSystem.readAsStringAsync(
          downloadRes.uri,
          { encoding: FileSystem.EncodingType.Base64 }
        );
        const imageBytes = base64ToUint8Array(base64Image);

        if (!imageBytes) {
          throw new Error("Image decoding failed.");
        }

        const finalUri = await saveBytesToLocalFile(imageBytes, cacheUri);
        setLocalUri(finalUri);
      } catch (e: any) {
        console.error("Failed to load or process image:", e);
        setError(e.message || "Could not load image.");
      } finally {
        setIsLoading(false);
        FileSystem.deleteAsync(
          FileSystem.documentDirectory + "temp_encrypted_image",
          { idempotent: true }
        );
      }
    };

    loadImage();
  }, [content]);

  return { localUri, isLoading, error };
};
