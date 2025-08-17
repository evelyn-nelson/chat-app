import { Text, View } from "react-native";
import Button from "../Global/Button/Button";
import { router } from "expo-router";

const AuthMenu = () => {
  return (
    <View className="h-full w-full bg-gray-900 flex items-center justify-center px-6">
      <View className="w-full max-w-md">
        {/* Logo and heading area */}
        <View className="mb-10 items-center">
          <View className="w-20 h-20 bg-blue-600 rounded-2xl mb-6 items-center justify-center">
            <Text className="text-white text-4xl font-bold">C</Text>
          </View>
          <Text className="text-blue-400 text-4xl font-bold">Chat App</Text>
          <Text className="text-gray-400 text-base mt-2 text-center">
            Connect with friends
          </Text>
        </View>

        {/* Auth buttons */}
        <View className="w-full space-y-4">
          <Button
            onPress={() => {
              router.push("/signup");
            }}
            text="Create Account"
            size="lg"
            variant="primary"
            className="w-full my-1"
          />

          <Button
            onPress={() => {
              router.push("/login");
            }}
            text="Sign In"
            size="lg"
            variant="secondary"
            className="w-full my-1"
          />
        </View>

        {/* Footer text */}
        <Text className="text-gray-500 text-sm mt-8 text-center">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
};

export default AuthMenu;
