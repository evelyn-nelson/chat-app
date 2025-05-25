import { useMemo } from "react";
import { Group } from "@/types/types";
import { Platform, ScrollView, Text, View } from "react-native";
import UserListItem from "./UserListItem";

type UserListProps = {
  group: Group;
  currentUserIsAdmin?: boolean;
};

const UserList = (props: UserListProps) => {
  const { group, currentUserIsAdmin } = props;

  const sortedGroupUsers = useMemo(() => {
    if (!group || !group.group_users) {
      return [];
    }

    return [...group.group_users].sort((userA, userB) => {
      if (userA.admin !== userB.admin) {
        return userA.admin ? -1 : 1;
      }
      if (userA.invited_at && !userB.invited_at) {
        return 1;
      }
      if (!userA.invited_at && userB.invited_at) {
        return -1;
      }
      if (!(userA.invited_at && userB.invited_at)) {
        return 0;
      }
      if (userA.invited_at < userB.invited_at) {
        return -1;
      }
      if (userA.invited_at > userB.invited_at) {
        return 1;
      }
      return 0;
    });
  }, [group, group?.group_users]);

  return (
    <View className="w-full rounded-lg overflow-hidden bg-gray-800">
      <ScrollView
        className="max-h-[300px]"
        contentContainerStyle={{
          width: "100%",
        }}
        showsVerticalScrollIndicator={Platform.OS !== "web"}
      >
        {sortedGroupUsers.map((user, index) => {
          const key = user.id || `user-${index}`;
          return (
            <View key={key}>
              <UserListItem
                user={user}
                group={group}
                index={index} // This index is from the *sorted* list
                currentUserIsAdmin={currentUserIsAdmin}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default UserList;
