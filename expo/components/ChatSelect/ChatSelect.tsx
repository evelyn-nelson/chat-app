import { View, Text, StyleSheet, Button } from "react-native";
import { ChatSelectBox } from "./ChatSelectBox";
import { ChatCreate } from "./ChatCreate";
import { useGlobalStore } from "../context/GlobalStoreContext";

export const ChatSelect = () => {
  const { user, groups } = useGlobalStore();
  return (
    <View style={styles.container}>
      {user ? (
        <View>
          <ChatCreate user={user} />
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
      ) : (
        <View>
          <Text>Not logged in</Text>
        </View>
      )}
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
