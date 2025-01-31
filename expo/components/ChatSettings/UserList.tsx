import { Group } from "@/types/types";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

const UserList = (props: { group: Group }) => {
  // MAKE SURE ADDING NEW USERS DOESN'T MAKE THIS GROW OFF THE PAGE
  const { group } = props;
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent]}
      >
        {group.group_users.map((user, index) => {
          const isLast = index === group.group_users.length - 1;
          return (
            <View
              key={user.id}
              style={isLast ? [styles.lastBox, styles.box] : [styles.box]}
            >
              <Text numberOfLines={1} style={styles.text}>
                {user.username}
              </Text>
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
    width: 250,
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
  },
  scrollContentWeb: {
    alignItems: "flex-start",
  },
  scrollContentMobile: {
    alignItems: "flex-start",
  },
  box: {
    height: 40,
    borderTopWidth: 1,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    width: "100%",
  },
  lastBox: {
    borderBottomWidth: 1,
  },
  text: {
    paddingHorizontal: 10,
  },
});
