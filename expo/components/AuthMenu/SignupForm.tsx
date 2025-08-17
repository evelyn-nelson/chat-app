import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuthUtils } from "../context/AuthUtilsContext";
import Button from "../Global/Button/Button";

export default function SignupForm() {
  const { signup } = useAuthUtils();

  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (username && email && password) {
      setIsLoading(true);
      try {
        await signup(username, email, password);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <View className="w-full">
      <View className="space-y-4 mb-6">
        <View>
          <Text className="text-sm font-medium text-gray-300 mb-1">Email</Text>
          <TextInput
            autoFocus
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Enter your email"
            placeholderTextColor="#6B7280"
            className="bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 w-full"
            onChangeText={setEmail}
            value={email}
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-300 mb-1">
            Username
          </Text>
          <TextInput
            autoCapitalize="none"
            placeholder="Choose a username"
            placeholderTextColor="#6B7280"
            className="bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 w-full"
            onChangeText={setUsername}
            value={username}
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-300 mb-1">
            Password
          </Text>
          <TextInput
            autoCapitalize="none"
            secureTextEntry={true}
            placeholder="Create a password"
            placeholderTextColor="#6B7280"
            className="bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 w-full"
            onChangeText={setPassword}
            value={password}
            onSubmitEditing={handleSignup}
          />
        </View>
      </View>

      <Button
        onPress={handleSignup}
        text={isLoading ? "Creating Account..." : "Sign Up"}
        size="lg"
        variant="primary"
        className="w-full"
        disabled={isLoading || !username || !email || !password}
      />

      <Text className="text-gray-400 text-xs text-center mt-4">
        By signing up, you agree to our Terms of Service and Privacy Policy
      </Text>
    </View>
  );
}
