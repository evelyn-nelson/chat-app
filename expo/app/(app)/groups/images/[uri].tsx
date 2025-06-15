import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ImageViewer } from "@/components/ChatBox/ImageViewer";

const ImageScreen = () => {
  const { uri: raw } = useLocalSearchParams<{ uri: string }>();
  const uri = decodeURIComponent(raw);
  return (
    <ImageViewer
      imageUrl={uri}
      onClose={() => {
        router.back();
      }}
    />
  );
};

export default ImageScreen;
