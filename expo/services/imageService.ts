import { Blurhash } from "react-native-blurhash";
import {
  ImageManipulator,
  SaveFormat,
  ImageResult,
} from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
export interface NormalizedImage extends ImageResult {
  base64: string;
}
export interface ProcessedImage {
  normalized: NormalizedImage;
  blurhash: string | null;
}

/**
 * Processes an image from its original URI. It performs two actions in one go:
 * 1. Creates a normalized, standard JPEG (max 1920px wide) for uploading.
 * 2. Creates a tiny thumbnail and uses it to generate a Blurhash string.
 * This ensures the expensive HDR-to-SDR conversion happens only ONCE.
 *
 * @param originalUri The local URI of the image to process.
 * @returns A promise that resolves to a ProcessedImage object.
 */
export const processImage = async (
  originalUri: string
): Promise<ProcessedImage> => {
  let thumbUri: string | undefined;
  try {
    const context = ImageManipulator.manipulate(originalUri);

    const mainImagePromise = context
      .resize({ width: 1920 })
      .renderAsync()
      .then((image) =>
        image.saveAsync({
          format: SaveFormat.JPEG,
          compress: 0.8,
          base64: true,
        })
      );

    const thumbImagePromise = context
      .resize({ width: 100 })
      .renderAsync()
      .then((image) =>
        image.saveAsync({
          format: SaveFormat.JPEG,
          compress: 0.5,
        })
      );

    const [normalizedResult, thumbResult] = await Promise.all([
      mainImagePromise,
      thumbImagePromise,
    ]);

    thumbUri = thumbResult.uri;

    const hash = await Blurhash.encode(thumbUri, 4, 3);

    if (!normalizedResult.base64) {
      throw new Error("Failed to get Base64 from manipulated image.");
    }

    return {
      normalized: normalizedResult as NormalizedImage,
      blurhash: hash,
    };
  } catch (error) {
    console.error("Failed to process image:", error);
    throw new Error("Image processing failed.");
  } finally {
    if (thumbUri) {
      await FileSystem.deleteAsync(thumbUri, { idempotent: true });
    }
  }
};
