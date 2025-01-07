import { View, Text, StyleSheet, Button } from "react-native";
import { ChatSelectBox } from "./ChatSelectBox";
import { ChatCreate } from "./ChatCreate/ChatCreate";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { Group } from "@/types/types";
import { useState, useEffect } from "react";
import ChatCreateModal from "./ChatCreate/ChatCreateModal";

export const ChatSelect = () => {
  const { store, groupsRefreshKey } = useGlobalStore();

  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    store
      .loadGroups()
      .then((savedGroups) => setGroups(savedGroups))
      .catch((error) => console.error(error));
  }, [groupsRefreshKey]);

  return (
    <View style={styles.container}>
      <View>
        <ChatCreateModal />
        {groups.map((group, index) => {
          return (
            <ChatSelectBox
              key={index}
              group={{
                ...group,
              }}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 50,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
});
