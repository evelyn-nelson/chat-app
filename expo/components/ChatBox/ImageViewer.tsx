import React from "react";
import {
  Modal,
  View,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";

interface ImageViewerProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  imageUrl,
  onClose,
}) => {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownload = async () => {
    if (!imageUrl) return;
    setIsDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "We need permission to save photos to your device."
        );
        return;
      }

      const fileUri = FileSystem.documentDirectory + `${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: imageUrl, to: fileUri });
      await MediaLibrary.createAssetAsync(fileUri);

      Alert.alert("Success", "Image saved to your photo library!");
    } catch (error) {
      console.error("Error saving image:", error);
      Alert.alert("Error", "Could not save the image.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Pressable className="flex-1 bg-black/80" onPress={onClose}>
      <View className="absolute top-2 left-1/2 transform -translate-x-1/2">
        <View className="w-8 h-1 bg-gray-600 rounded-full" />
      </View>
      <SafeAreaView className="flex-1">
        <View className="flex-1 items-center justify-center p-4">
          {imageUrl && (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
            />
          )}
        </View>

        <View className="absolute bottom-10 right-5 flex-row items-center">
          <TouchableOpacity
            onPress={handleDownload}
            disabled={isDownloading}
            className="p-3 bg-black/50 rounded-full"
          >
            {isDownloading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="download-outline" size={28} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Pressable>
  );
};
