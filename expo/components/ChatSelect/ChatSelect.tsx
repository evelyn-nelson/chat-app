import {
  View,
  Text,
  StyleSheet,
  Button,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { ChatSelectBox } from "./ChatSelectBox";
import { ChatCreate } from "./ChatCreate/ChatCreate";
import { useGlobalStore } from "../context/GlobalStoreContext";
import { Group } from "@/types/types";
import { useState, useEffect, useCallback } from "react";
import ChatCreateModal from "./ChatCreate/ChatCreateModal";
import { useWebSocket } from "../context/WebSocketContext";

export const ChatSelect = () => {
  const { store, groupsRefreshKey, refreshGroups } = useGlobalStore();
  const { getGroups } = useWebSocket();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [groups, setGroups] = useState<Group[]>([]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getGroups();
      store.saveGroups(data);
      refreshGroups();
    } catch (error) {
      console.error(error);
    }
    setTimeout(() => {
      setRefreshing(false);
    }, 300);
  }, []);

  useEffect(() => {
    store
      .loadGroups()
      .then((savedGroups) => setGroups(savedGroups))
      .catch((error) => console.error(error));
  }, [groupsRefreshKey]);

  return (
    <View
      style={
        Platform.OS != "web"
          ? [styles.container, styles.nativeWidth]
          : [styles.container, styles.webWidth]
      }
    >
      <ChatCreateModal />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.select({
            web: styles.scrollContentWeb,
            native: styles.scrollContentMobile,
          }),
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={60}
          />
        }
      >
        <View style={styles.listPadding}></View>
        {groups.map((group, index) => {
          const isLast = index === groups.length - 1;
          return (
            <ChatSelectBox
              key={group.id || index}
              group={{
                ...group,
              }}
              isLast={isLast}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  webWidth: {
    width: 250,
  },
  nativeWidth: {
    width: "100%",
  },
  container: {
    flex: 1,
    marginTop: 50,
    borderRightWidth: 2,
  },
  scrollView: {
    flex: 1,
    width: "100%",
    height: "100%",
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

  listPadding: {
    height: 10,
  },
});
