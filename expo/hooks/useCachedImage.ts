import { useState, useEffect, useRef } from "react";
import * as FileSystem from "expo-file-system";
import http from "@/util/custom-axios";
import { ClearImage, ImageMessageContent } from "@/types/types";
import {
  base64ToUint8Array,
  decryptImageFile,
  saveBytesToLocalFile,
} from "@/services/encryptionService";

const CACHE_DIR = FileSystem.cacheDirectory + "image_cache/";

const ongoingDownloads = new Map<string, Promise<string>>();

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
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      if (!content?.objectKey) {
        setLocalUri(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      if (content.localUri) {
        setLocalUri(content.localUri);
        setIsLoading(false);
        setError(null);
        return;
      }

      const filename = content.objectKey.replace(/\//g, "_");
      const cacheUri = `${CACHE_DIR}${filename}`;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const currentAbortController = abortControllerRef.current;

      try {
        setIsLoading(true);
        setError(null);
        await ensureDirExists();

        const fileInfo = await FileSystem.getInfoAsync(cacheUri);
        if (fileInfo.exists) {
          if (!currentAbortController.signal.aborted) {
            setLocalUri(cacheUri);
          }
          return;
        }

        let downloadPromise = ongoingDownloads.get(content.objectKey);

        if (!downloadPromise) {
          downloadPromise = performDownloadEncrypted(content, cacheUri);
          ongoingDownloads.set(content.objectKey, downloadPromise);
        }

        const finalUri = await downloadPromise;

        if (!currentAbortController.signal.aborted) {
          setLocalUri(finalUri);
        }
      } catch (e: any) {
        if (!currentAbortController.signal.aborted) {
          console.error("Failed to load or process image:", e);
          setError(e.message || "Could not load image.");
        }
      } finally {
        if (!currentAbortController.signal.aborted) {
          setIsLoading(false);
        }
        ongoingDownloads.delete(content.objectKey);
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
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      if (!content?.imageURL) {
        setLocalUri(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      const imageURL = content.imageURL;
      const filename = imageURL.replace(/\//g, "_");
      const cacheUri = `${CACHE_DIR}${filename}`;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const currentAbortController = abortControllerRef.current;

      try {
        setIsLoading(true);
        setError(null);
        await ensureDirExists();

        const fileInfo = await FileSystem.getInfoAsync(cacheUri);
        if (fileInfo.exists) {
          if (!currentAbortController.signal.aborted) {
            setLocalUri(cacheUri);
          }
          return;
        }

        let downloadPromise = ongoingDownloads.get(imageURL);

        if (!downloadPromise) {
          downloadPromise = performDownloadClear(imageURL, cacheUri);
          ongoingDownloads.set(imageURL, downloadPromise);
        }

        const finalUri = await downloadPromise;

        if (!currentAbortController.signal.aborted) {
          setLocalUri(finalUri);
        }
      } catch (e: any) {
        if (!currentAbortController.signal.aborted) {
          console.error("Failed to load or process image:", e);
          setError(e.message || "Could not load image.");
        }
      } finally {
        if (!currentAbortController.signal.aborted) {
          setIsLoading(false);
        }
        ongoingDownloads.delete(imageURL);
      }
    };

    loadImage();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [content?.imageURL]);

  return { localUri, isLoading, error };
};

const performDownloadClear = async (
  imageURL: string,
  cacheUri: string
): Promise<string> => {
  const presignRes = await http.post(
    `${process.env.EXPO_PUBLIC_HOST}/images/presign-download`,
    { objectKey: imageURL }
  );
  const { downloadUrl } = presignRes.data;

  // Download directly to memory and write once
  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  const imageBytes = new Uint8Array(buf);

  const finalUri = await saveBytesToLocalFile(imageBytes, cacheUri);

  return finalUri;
};

const performDownloadEncrypted = async (
  content: ImageMessageContent,
  cacheUri: string
): Promise<string> => {
  const presignRes = await http.post(
    `${process.env.EXPO_PUBLIC_HOST}/images/presign-download`,
    { objectKey: content.objectKey }
  );
  const { downloadUrl } = presignRes.data;

  // Download directly to memory and decrypt
  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  const encryptedBytes = new Uint8Array(ab);

  const key = base64ToUint8Array(content.decryptionKey);
  const nonce = base64ToUint8Array(content.nonce);
  const decryptedBytes = await decryptImageFile(encryptedBytes, key, nonce);

  if (!decryptedBytes) {
    throw new Error("Image decryption failed.");
  }

  const finalUri = await saveBytesToLocalFile(decryptedBytes, cacheUri);

  return finalUri;
};
