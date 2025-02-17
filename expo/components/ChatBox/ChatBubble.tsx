import { MessageUser } from "@/types/types";
import { StyleSheet, Text, View } from "react-native";

const ChatBubble = (props: {
  prevUserId: number;
  user: MessageUser;
  message: string;
  align: string;
}) => {
  const { align, user, prevUserId, message } = props;
  return (
    <View className={align === "left" ? "ml-[5] py-1" : "ml-auto mr-[5] py-1"}>
      {prevUserId != user.id && (
        <Text className="ml-[10] mt-[1] text-sky-300 text-sm">
          {props.user.username}
        </Text>
      )}
      <View className="mt-[2] h-auto w-[150] border-2 border-blue-200 rounded-2xl">
        <Text
          selectable={true}
          className="text-left my-auto ml-[5] p-[5] max-w-[140] flex-wrap shrink text-blue-200"
        >
          {message}
        </Text>
      </View>
    </View>
  );
};

export default ChatBubble;
