import { StyleSheet, Text, View } from "react-native";

const ChatBubble = (props: {
  username: string;
  message: string;
  align: string;
}) => {
  const style =
    props.align === "left" ? styles.chatBubbleLeft : styles.chatBubbleRight;
  return (
    <View style={style}>
      <Text style={styles.chatTextUsername}>{props.username}</Text>
      <View style={[styles.chatBubble]}>
        <Text style={styles.chatText}>{props.message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chatBubble: {
    marginTop: 3,
    height: "auto",
    width: 150,
    borderWidth: 2,
    borderRadius: 20,
    overflow: "hidden",
  },
  chatBubbleLeft: {
    marginLeft: 5,
  },
  chatBubbleRight: {
    marginLeft: "auto",
    marginRight: 5,
  },
  chatTextUsername: {
    marginTop: 3,
    marginLeft: 10,
    color: "#808080",
    fontSize: 10,
  },
  chatText: {
    textAlign: "left",
    marginTop: "auto",
    marginBottom: "auto",
    marginLeft: 5,
    padding: 6,
    maxWidth: 140,
    flexWrap: "wrap",
    flexShrink: 1,
  },
});

export default ChatBubble;
