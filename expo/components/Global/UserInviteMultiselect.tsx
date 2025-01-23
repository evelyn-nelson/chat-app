import { StyleSheet, Text, TextInput, View } from "react-native";
import { useState } from "react";
import TagInput from "@/components/Global/TagInput";

const UserInviteMultiselect = (props: {
  placeholderText: string;
  userList: string[];
  setUserList: React.Dispatch<React.SetStateAction<string[]>>;
}) => {
  const { placeholderText, userList, setUserList } = props;
  return (
    <View style={styles.container}>
      <TagInput
        placeholderText={placeholderText}
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
