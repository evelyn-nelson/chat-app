import { Pressable, Text, View } from "react-native";
import React from "react";

type ButtonProps = {
  onPress: () => void;
  text: string;
  size?: "xs" | "sm" | "base" | "lg" | "xl";
  variant?: "primary" | "secondary" | "outline" | "ghost";
  border?: boolean;
  className?: string;
  textClassName?: string;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

const Button = ({
  onPress,
  text,
  size = "base",
  variant = "primary",
  border = false,
  className = "",
  textClassName = "",
  disabled = false,
  leftIcon,
  rightIcon,
}: ButtonProps) => {
  const sizeStyles = {
    xs: "py-1 px-2",
    sm: "py-1.5 px-3",
    base: "py-2 px-4",
    lg: "py-2.5 px-5",
    xl: "py-3 px-6",
  };

  const textSizeStyles = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };

  const variantStyles = {
    primary: "bg-blue-600 active:bg-blue-700",
    secondary: "bg-gray-800 active:bg-gray-700",
    outline: "bg-transparent border border-blue-400 active:bg-blue-500/10",
    ghost: "bg-transparent active:bg-gray-700/30",
  };

  const variantTextStyles = {
    primary: "text-white font-medium",
    secondary: "text-blue-300 font-medium",
    outline: "text-blue-400 font-medium",
    ghost: "text-blue-300",
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`
      ${sizeStyles[size]} 
      ${variantStyles[variant]} 
      ${border ? "border border-blue-400 active:border-blue-500" : ""} 
      ${disabled ? "opacity-50" : ""}
      rounded-lg items-center justify-center flex-row
      z-10
      ${className}
    `}
    >
      {leftIcon && <View className="mr-2">{leftIcon}</View>}
      <Text
        className={`
          ${textSizeStyles[size]} 
          ${variantTextStyles[variant]}
          ${disabled ? "opacity-70" : ""}
          ${textClassName}
        `}
      >
        {text}
      </Text>
      {rightIcon && <View className="ml-2">{rightIcon}</View>}
    </Pressable>
  );
};

export default Button;
