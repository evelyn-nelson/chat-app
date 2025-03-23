import { Pressable, StyleSheet, Text, View } from "react-native";
import React from "react";

type ButtonProps = {
  onPress: () => void;
  text: string;
  size: string;
  border?: boolean;
  className?: string;
};

const Button = (props: ButtonProps) => {
  const { onPress, text, size, border, className } = props;
  return (
    <Pressable
      onPress={onPress}
      className={`${border === false ? "" : `border-4 border-blue-300 hover:border-blue-400 active:border-blue-400`} bg-blue-500 hover:bg-blue-600 active:bg-blue-600 rounded-lg items-center justify-center ${className}`}
    >
      <Text className={`text-blue-200 text-${size} pt-1 pb-1 pl-1 pr-1`}>
        {text}
      </Text>
    </Pressable>
  );
};

export default Button;
