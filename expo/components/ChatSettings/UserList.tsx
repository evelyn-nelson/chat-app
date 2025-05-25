import { Group } from "@/types/types";
import { Platform, ScrollView, Text, View } from "react-native";
import UserListItem from "./UserListItem";

type UserListProps = {
  group: Group;
  currentUserIsAdmin?: boolean;
};

const UserList = (props: UserListProps) => {
  const { group, currentUserIsAdmin } = props;

  return (
    <View className="w-full rounded-lg overflow-hidden bg-gray-800">
      <ScrollView
        className="max-h-[300px]"
        contentContainerStyle={{
          width: "100%",
        }}
        showsVerticalScrollIndicator={Platform.OS !== "web"}
      >
        {group.group_users.map((user, index) => {
          return (
            <View key={index}>
              <UserListItem
                user={user}
                group={group}
                index={index}
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
