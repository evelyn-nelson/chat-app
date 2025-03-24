import { WebSocketProvider } from "@/components/context/WebSocketContext";
import { GlobalStoreProvider } from "@/components/context/GlobalStoreContext";
import { Stack, Tabs } from "expo-router";
import { AuthUtilsProvider } from "@/components/context/AuthUtilsContext";
import { MessageStoreProvider } from "@/components/context/MessageStoreContext";

import "../styles/global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GlobalStoreProvider>
        <WebSocketProvider>
          <MessageStoreProvider>
            <AuthUtilsProvider>
              <Stack>
                <Stack.Screen name="signin" options={{ headerShown: false }} />
                <Stack.Screen name="(app)" options={{ headerShown: false }} />
              </Stack>
            </AuthUtilsProvider>
          </MessageStoreProvider>
        </WebSocketProvider>
      </GlobalStoreProvider>
    </SafeAreaProvider>
  );
}
