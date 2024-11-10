import { ChatSelect } from "@/components/ChatSelect/ChatSelect";
import UsernameInput from "@/components/settings/UsernameInput";
import { Link, router, Stack } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useGlobalState } from "@/components/context/GlobalStateContext";

export default function HomeScreen() {
  const { setUser } = useGlobalState();
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Home" }} />
      <UsernameInput
        passValueToParent={setUser}
        onSubmitAction={() => router.push({ pathname: "/groups" })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
});
