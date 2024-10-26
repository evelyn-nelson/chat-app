import { Room, User } from "@/types/types";
import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useReducer,
  useState,
} from "react";

interface GlobalStateContextType {
  user: User | undefined;
  setUser: Dispatch<SetStateAction<User | undefined>>;
  rooms: Room[];
  setRooms: Dispatch<SetStateAction<Room[]>>;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(
  undefined
);

export const GlobalStateProvider = (props: { children: React.ReactNode }) => {
  const { children } = props;
  const [user, setUser] = useState<User>();
  const [rooms, setRooms] = useState<Room[]>([]);

  return (
    <GlobalStateContext.Provider value={{ user, setUser, rooms, setRooms }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error("useGlobalState must be used within a GlobalStateProvider");
  }
  return context;
};
