import { Group } from "@/types/types";
import { Pressable, View, Text } from "react-native";
import { router, usePathname } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import GroupAvatarSmall from "../GroupAvatarSmall";

export const ChatSelectBox = (props: {
  group: Group;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const { group, isFirst, isLast } = props;
  const pathname = usePathname();
  const isActive = pathname === `/groups/${group.id}`;

  return (
    <Pressable
      className={`
        ${!isFirst ? "border-t border-gray-700" : ""}
        ${isActive ? "bg-gray-700" : ""}
      `}
      onPress={() => {
        router.push(`/groups/${group.id}`);
      }}
    >
      <View className="flex-row items-center py-3 px-4">
        <View className="w-8 h-8 rounded-full bg-blue-600 mr-2 overflow-hidden">
          <GroupAvatarSmall
            imageURL={group.image_url ?? null}
            blurhash={group.blurhash ?? null}
            name={group.name}
          />
        </View>

        <View className="flex-1">
          <Text
            numberOfLines={1}
            className="text-base font-medium text-gray-200"
          >
            {group.name}
          </Text>

          {group.group_users && (
            <Text numberOfLines={1} className="text-xs text-gray-400">
              {group.group_users.length}{" "}
              {group.group_users.length === 1 ? "member" : "members"}
            </Text>
          )}
        </View>

        <Ionicons
          name="chevron-forward"
          size={16}
          color={isActive ? "#60A5FA" : "#9CA3AF"}
        />
      </View>
    </Pressable>
  );
};
