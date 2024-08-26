import { WebSocketProvider } from "@/components/WebSocketContext";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <WebSocketProvider>
      <Stack>
        <Stack.Screen name="index" />
        <Stack.Screen name="rooms/[id]" />
      </Stack>
    </WebSocketProvider>
  );
}
