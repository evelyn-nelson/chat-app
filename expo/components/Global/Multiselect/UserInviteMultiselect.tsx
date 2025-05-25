import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useGlobalStore } from "../../context/GlobalStoreContext";
import { User } from "@/types/types";
import UserMultiSelect from "@/components/Global/Multiselect/UserMultiselect";
import Ionicons from "@expo/vector-icons/Ionicons";

const UserInviteMultiselect = (props: {
  placeholderText: string;
  userList: string[];
  setUserList: React.Dispatch<React.SetStateAction<string[]>>;
  excludedUserList: User[];
}) => {
  const { placeholderText, userList, setUserList, excludedUserList } = props;
  const { store, usersRefreshKey } = useGlobalStore();
  const [contacts, setContacts] = useState<User[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [errorLoadingContacts, setErrorLoadingContacts] = useState<
    string | null
  >(null);

  useEffect(() => {
    const loadContacts = async () => {
      setIsLoadingContacts(true);
      setErrorLoadingContacts(null);
      try {
        const users = await store.loadUsers();
        setContacts(users);
      } catch (error) {
        console.error("Failed to load contacts:", error);
        setErrorLoadingContacts(
          "Could not load contacts. Please try again later."
        );
      } finally {
        setIsLoadingContacts(false);
      }
    };
    loadContacts();
  }, [usersRefreshKey, store]); // store is likely stable, usersRefreshKey triggers

  if (isLoadingContacts) {
    return (
      <View className="w-full h-32 items-center justify-center bg-gray-800 rounded-lg p-3">
        <ActivityIndicator size="small" color="#9CA3AF" />
        <Text className="text-gray-400 mt-2">Loading contacts...</Text>
      </View>
    );
  }

  if (errorLoadingContacts) {
    return (
      <View className="w-full h-32 items-center justify-center bg-gray-800 rounded-lg p-3">
        <Ionicons name="warning-outline" size={24} color="#F87171" />
        <Text className="text-red-400 mt-2 text-center">
          {errorLoadingContacts}
        </Text>
      </View>
    );
  }

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
