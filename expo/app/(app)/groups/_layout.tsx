import { useGlobalStore } from "@/components/context/GlobalStoreContext";
import { Stack } from "expo-router";

type GroupParams = {
  id: string;
};

export default function GroupLayout() {
  const { groups } = useGlobalStore();

  const getGroup = (id: string) => {
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].id.toString() === id) {
        return groups[i];
      }
    }
  };

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={({ route }) => {
          const { id } = route.params as GroupParams;
          const group = getGroup(id);
          return {
            title: group?.name ?? `Loading...`,
            headerShown: true,
          };
        }}
      />
    </Stack>
  );
}
