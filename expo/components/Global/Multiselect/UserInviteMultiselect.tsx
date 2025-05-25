import { StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
import TagInput from "@/components/Global/Multiselect/UserMultiselect";
import { useGlobalStore } from "../../context/GlobalStoreContext";
import { User } from "@/types/types";
import UserMultiSelect from "@/components/Global/Multiselect/UserMultiselect";

const UserInviteMultiselect = (props: {
  placeholderText: string;
  userList: string[];
  setUserList: React.Dispatch<React.SetStateAction<string[]>>;
  excludedUserList: User[];
}) => {
  const { placeholderText, userList, setUserList, excludedUserList } = props;
  const { store, usersRefreshKey } = useGlobalStore();
  const [contacts, setContacts] = useState<User[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const users = await store.loadUsers();
        setContacts(users);
      } catch (error) {
        console.error(error);
      }
    })();
  }, [usersRefreshKey]);

  return (
    <View className="w-full">
      <UserMultiSelect
        placeholderText={placeholderText}
        tags={userList}
        options={contacts}
        setTags={setUserList}
        excludedUserList={excludedUserList}
      />
    </View>
  );
};

export default UserInviteMultiselect;
