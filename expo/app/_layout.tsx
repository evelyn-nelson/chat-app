import { WebSocketProvider } from "@/components/context/WebSocketContext";
import { GlobalStoreProvider } from "@/components/context/GlobalStoreContext";
import { Stack, Tabs } from "expo-router";
import { AuthUtilsProvider } from "@/components/context/AuthUtilsContext";
import { MessageStoreProvider } from "@/components/context/MessageStoreContext";

import "../styles/global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { useEffect } from "react";

export default function RootLayout() {
  useEffect(() => {
    console.log("here");
    // SystemUI.setBackgroundColorAsync("#111827");
  }, []);

  return (
    <SafeAreaProvider>
      <ActionSheetProvider>
        <GlobalStoreProvider>
          <WebSocketProvider>
            <MessageStoreProvider>
              <AuthUtilsProvider>
                <Stack>
                  <Stack.Screen
                    name="(auth)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen name="(app)" options={{ headerShown: false }} />
                </Stack>
              </AuthUtilsProvider>
            </MessageStoreProvider>
          </WebSocketProvider>
        </GlobalStoreProvider>
      </ActionSheetProvider>
    </SafeAreaProvider>
  );
}
