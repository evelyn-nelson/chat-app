import { useState } from "react";
import { Text, TextInput, View, Pressable } from "react-native";
import { useAuthUtils } from "../context/AuthUtilsContext";
import Button from "../Global/Button/Button";

export default function LoginForm({ onSubmit }: { onSubmit: () => void }) {
  const { login } = useAuthUtils();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (email && password) {
      setIsLoading(true);
      setError(null);
      try {
        await login(email, password);
        onSubmit();
      } catch (err) {
        setError("Login failed. Please check your credentials and try again.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <View className="w-full">
      <Text className="text-2xl font-bold text-blue-400 mb-6">
        Welcome Back
      </Text>

      {error && (
        <View className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">
          <Text className="text-red-400 text-sm">{error}</Text>
        </View>
      )}

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
            Password
          </Text>
          <TextInput
            autoCapitalize="none"
            secureTextEntry={true}
            placeholder="Enter your password"
            placeholderTextColor="#6B7280"
            className="bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 w-full"
            onChangeText={setPassword}
            value={password}
            onSubmitEditing={handleLogin}
          />
        </View>
      </View>

      <Button
        onPress={handleLogin}
        text={isLoading ? "Signing In..." : "Sign In"}
        size="lg"
        variant="primary"
        className="w-full"
        disabled={isLoading || !email || !password}
      />

      <Pressable className="mt-4">
        <Text className="text-blue-400 text-center text-sm">
          Forgot your password?
        </Text>
      </Pressable>
    </View>
  );
}
