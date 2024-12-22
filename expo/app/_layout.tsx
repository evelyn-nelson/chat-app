import { WebSocketProvider } from "@/components/context/WebSocketContext";
import { GlobalStoreProvider } from "@/components/context/GlobalStoreContext";
import { Stack, Tabs } from "expo-router";
import { AuthUtilsProvider } from "@/components/context/AuthUtilsContext";

export default function RootLayout() {
  return (
    <GlobalStoreProvider>
      <WebSocketProvider>
        <AuthUtilsProvider>
          <Stack>
            <Stack.Screen name="signin" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        </AuthUtilsProvider>
      </WebSocketProvider>
    </GlobalStoreProvider>
  );
}
