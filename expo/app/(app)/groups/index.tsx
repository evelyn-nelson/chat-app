import { ChatSelect } from "@/components/ChatSelect/ChatSelect";
import { View } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 justify-start items-start bg-[#7faee3]">
      <ChatSelect />
    </View>
  );
}
