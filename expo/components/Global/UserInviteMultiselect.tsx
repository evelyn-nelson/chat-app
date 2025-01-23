import { StyleSheet, Text, TextInput, View } from "react-native";
import { useState } from "react";
import TagInput from "@/components/Global/TagInput";

const UserInviteMultiselect = (props: {
  userList: string[];
  setUserList: React.Dispatch<React.SetStateAction<string[]>>;
}) => {
  const { userList, setUserList } = props;
  return (
    <View style={styles.container}>
      <TagInput
        placeholderText={"Users to invite"}
        tags={userList}
        setTags={setUserList}
      />
    </View>
  );
};

export default UserInviteMultiselect;

const styles = StyleSheet.create({
  container: {
    marginLeft: 12,
  },
});
