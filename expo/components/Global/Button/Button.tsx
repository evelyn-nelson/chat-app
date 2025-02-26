import { Pressable, StyleSheet, Text, View } from "react-native";
import React from "react";

type ButtonProps = {
  onPress: () => void;
  text: string;
  size: string;
  border?: boolean;
};

const Button = (props: ButtonProps) => {
  const { onPress, text, size, border } = props;
  return (
    <View>
      <Pressable
        onPress={onPress}
        className={`${border === false ? "" : `border-4 border-blue-300 hover:border-blue-400 active:border-blue-400`} bg-blue-500 hover:bg-blue-600 active:bg-blue-600 rounded-lg flex items-center min-w-[280] justify-center`}
      >
        <Text className={`text-blue-200 text-${size} pt-1 pb-1 pl-1 pr-1`}>
          {text}
        </Text>
      </Pressable>
    </View>
  );
};

export default Button;

const styles = StyleSheet.create({});
