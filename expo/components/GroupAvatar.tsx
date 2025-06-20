import React, { memo, useMemo } from "react";
import {
  View,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Text,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Blurhash } from "react-native-blurhash";
import { Image } from "expo-image";
import { useCachedImageClear } from "@/hooks/useCachedImage";

type Props = {
  imageURL: string | null;
  blurhash: string | null;
  isEditing: boolean;
  isAdmin: boolean;
  onPick: () => void;
  onRemove: () => void;
};

const GroupAvatar = memo(function GroupAvatar({
  imageURL,
  blurhash,
  isEditing,
  isAdmin,
  onPick,
  onRemove,
}: Props) {
  const params = useMemo(() => ({ imageURL, blurhash }), [imageURL, blurhash]);

  const { localUri, isLoading, error } = useCachedImageClear(params);

  let content;
  if (isLoading) {
    content = <ActivityIndicator size="large" color="gray" />;
  } else if (error) {
    content = (
      <Ionicons name="alert-circle-outline" size={40} color="#f87171" />
    );
  } else if (localUri) {
    content = (
      <>
        {blurhash && <Blurhash blurhash={blurhash} style={styles.blurhash} />}
        <Image
          source={{ uri: localUri }}
          style={styles.image}
          contentFit="cover"
        />
      </>
    );
  } else {
    content = <Ionicons name="image-outline" size={48} color="gray" />;
  }
  console.log({ isEditing, isAdmin, imageURL });
  return (
    <View style={styles.container}>
      <View style={styles.avatarWrapper}>
        <Pressable
          onPress={isEditing && isAdmin ? onPick : undefined}
          disabled={!isEditing || !isAdmin}
          style={styles.avatarInner}
        >
          {content}
        </Pressable>

        {isEditing && isAdmin && (
          <Pressable onPress={onPick} style={styles.pencilButton}>
            <Ionicons name="pencil" size={16} color="white" />
          </Pressable>
        )}

        {isEditing && isAdmin && imageURL && (
          <Pressable onPress={onRemove} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={16} color="red" />
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 16,
  },
  avatarWrapper: {
    position: "relative",
    width: 112,
    height: 112,
  },
  avatarInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#374151",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  blurhash: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 56,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  pencilButton: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3B82F6",
    borderWidth: 2,
    borderColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#b91c1c",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default GroupAvatar;
