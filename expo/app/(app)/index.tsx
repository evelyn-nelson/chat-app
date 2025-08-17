import { View, StyleSheet } from "react-native";
import ConnectionTesting from "@/components/ConnectionTesting";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ConnectionTesting />
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
