import { useMemo } from "react";
import { Group, GroupUser } from "@/types/types";
import { Platform, ScrollView, View } from "react-native"; // Removed Text
import UserListItem from "./UserListItem";

type UserListProps = {
  group: Group;
  currentUserIsAdmin?: boolean;
  onUserKicked: (userId: string) => void;
};

const UserList = (props: UserListProps) => {
  const { group, currentUserIsAdmin, onUserKicked } = props;

  const sortedGroupUsers = useMemo(() => {
    if (!group?.group_users) {
      return [];
    }
    return [...group.group_users].sort((userA, userB) => {
      if (userA.admin !== userB.admin) {
        return userA.admin ? -1 : 1;
      }
      if (!(userA && userB)) {
        return 0;
      }
      if (userA.invited_at && userB.invited_at) {
        if (userA.invited_at < userB.invited_at) return -1;
        if (userA.invited_at > userB.invited_at) return 1;
      } else if (userA.invited_at) {
        return -1;
      } else if (userB.invited_at) {
        return 1;
      }
      return userA.username.localeCompare(userB.username);
    });
  }, [group?.group_users]);

  return (
    <View className="w-full rounded-lg overflow-hidden bg-gray-800">
      <ScrollView
        className="max-h-[300px]"
        contentContainerStyle={{
          width: "100%",
        }}
        showsVerticalScrollIndicator
      >
        {sortedGroupUsers.map((user, index) => (
          <UserListItem
            key={user.id}
            user={user}
            group={group}
            index={index}
            currentUserIsAdmin={currentUserIsAdmin}
            onKickSuccess={onUserKicked}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default UserList;
