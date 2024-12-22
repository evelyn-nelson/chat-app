import { Group, Message, User } from "@/types/types";
import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useReducer,
  useState,
} from "react";

interface GlobalStoreContextType {
  user: User | undefined;
  setUser: Dispatch<SetStateAction<User | undefined>>;
  groups: Group[];
  setGroups: Dispatch<SetStateAction<Group[]>>;
}

const GlobalStoreContext = createContext<GlobalStoreContextType | undefined>(
  undefined
);

export const GlobalStoreProvider = (props: { children: React.ReactNode }) => {
  const { children } = props;
  const [user, setUser] = useState<User>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  return (
    <GlobalStoreContext.Provider value={{ user, setUser, groups, setGroups }}>
      {children}
    </GlobalStoreContext.Provider>
  );
};

export const useGlobalStore = () => {
  const context = useContext(GlobalStoreContext);
  if (!context) {
    throw new Error("useGlobalStore must be used within a GlobalStoreProvider");
  }
  return context;
};
