import { WebSocketProvider } from "@/components/context/WebSocketContext";
import { GlobalStateProvider } from "@/components/context/GlobalStateContext";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <GlobalStateProvider>
      <WebSocketProvider>
        <Stack>
          <Stack.Screen name="index" />
          <Stack.Screen name="groups" />
          <Stack.Screen name="group/[id]" />
        </Stack>
      </WebSocketProvider>
    </GlobalStateProvider>
  );
}
