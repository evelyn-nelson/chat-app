import { Blurhash } from "react-native-blurhash";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

/**
 * Generates a BlurHash string from a local image URI.
 * It first creates a small thumbnail to ensure fast processing.
 * @param imageUri The local URI of the original, high-resolution image.
 * @returns A promise that resolves to the BlurHash string, or null if generation fails.
 */
export const generateBlurhash = async (
  imageUri: string
): Promise<string | null> => {
  let thumbnailUri: string | undefined;
  let sanitizedImageUri: string | undefined;
  try {
    const context = ImageManipulator.manipulate(imageUri);
    context.resize({ width: 100 });
    const image = await context.renderAsync();
    const result = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.5,
    });

    thumbnailUri = result.uri;

    const hash = await Blurhash.encode(thumbnailUri, 4, 3);
    return hash;
  } catch (e) {
    console.warn("Failed to generate BlurHash for image:", e);
    return null;
  } finally {
    const cleanupPromises: Promise<void>[] = [];
    if (thumbnailUri) {
      cleanupPromises.push(
        FileSystem.deleteAsync(thumbnailUri, { idempotent: true })
      );
    }
    await Promise.all(cleanupPromises);
  }
};
