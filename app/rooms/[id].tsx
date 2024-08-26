import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

const RoomPage = () => {
  const { id } = useLocalSearchParams();
  return (
    <View>
      <Text>{id}</Text>
    </View>
  );
};

export default RoomPage;

const styles = StyleSheet.create({});
