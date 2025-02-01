import { Group } from "@/types/types";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import UserListItem from "./UserListItem";

const UserList = (props: { group: Group }) => {
  const { group } = props;
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent]}
        showsVerticalScrollIndicator={Platform.OS !== "web"}
      >
        {group.group_users.map((user, index) => {
          const isLast = index === group.group_users.length - 1;
          return (
            <View
              key={index}
              style={isLast ? [styles.lastBox, styles.box] : [styles.box]}
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

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    height: 400,
    width: 300,
    overflow: "hidden",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    width: "100%",
  },
  box: {
    height: 40,
    borderTopWidth: 1,
    width: "100%",
    justifyContent: "center",
  },
  lastBox: {
    borderBottomWidth: 1,
  },
});
