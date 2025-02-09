import { Group } from "@/types/types";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import UserListItem from "./UserListItem";

const UserList = (props: { group: Group }) => {
  const { group } = props;
  return (
    <View className="border-2 border-blue-950 h-[400] w-[300] overflow-hidden">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          width: "100%",
        }}
        showsVerticalScrollIndicator={Platform.OS !== "web"}
      >
        {group.group_users.map((user, index) => {
          const isLast = index === group.group_users.length - 1;
          return (
            <View
              key={index}
              className={`${isLast ? "border-b" : ""} h-[40] border-t w-full justify-center`}
            >
              <UserListItem user={user} group={group} />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default UserList;