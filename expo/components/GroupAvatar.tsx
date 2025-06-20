import React, { memo, useMemo } from "react";
import { View, Pressable, ActivityIndicator, StyleSheet } from "react-native";
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

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60A5FA" />
      </View>
    );
  } else if (error) {
    content = (
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
      </View>
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
    content = (
      <View style={styles.iconContainer}>
        <Ionicons name="image-outline" size={52} color="#9CA3AF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrapper}>
        <Pressable
          onPress={isEditing && isAdmin ? onPick : undefined}
          disabled={!isEditing || !isAdmin}
          style={[
            styles.avatarInner,
            isEditing && isAdmin && styles.editableAvatar,
          ]}
        >
          {content}

          {isEditing && isAdmin && (
            <View style={styles.editOverlay}>
              <Ionicons name="camera" size={24} color="white" />
            </View>
          )}
        </Pressable>

        {isEditing && isAdmin && (
          <Pressable
            onPress={onPick}
            style={styles.editButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.editButtonInner}>
              <Ionicons name="pencil" size={18} color="white" />
            </View>
          </Pressable>
        )}

        {isEditing && isAdmin && imageURL && (
          <Pressable
            onPress={onRemove}
            style={styles.removeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.removeButtonInner}>
              <Ionicons name="close" size={16} color="white" />
            </View>
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
    width: 120,
    height: 120,
    overflow: "visible",
  },
  avatarInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#374151",
    borderWidth: 3,
    borderColor: "#4B5563",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  editableAvatar: {
    borderColor: "#3B82F6",
    borderWidth: 2,
  },
  editOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 60,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  blurhash: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  editButton: {
    position: "absolute",
    bottom: 4,
    right: 4,
    zIndex: 10,
  },
  editButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3B82F6",
    borderWidth: 3,
    borderColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    zIndex: 10,
  },
  removeButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});

export default GroupAvatar;
