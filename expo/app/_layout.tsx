import { WebSocketProvider } from "@/components/context/WebSocketContext";
import { GlobalStateProvider } from "@/components/context/GlobalStateContext";
import { Stack, Tabs } from "expo-router";
import { AuthUtilsProvider } from "@/components/context/AuthUtilsContext";

export default function RootLayout() {
  return (
    <GlobalStateProvider>
      <WebSocketProvider>
        <AuthUtilsProvider>
          <Stack>
            <Stack.Screen name="signin" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        </AuthUtilsProvider>
      </WebSocketProvider>
    </GlobalStateProvider>
  );
}
