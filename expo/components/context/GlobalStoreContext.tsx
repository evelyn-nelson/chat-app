import { Store } from "@/store/Store";
import { Group, Message, User } from "@/types/types";
import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";

type Action =
  | { type: "SET_USER"; payload: User | undefined }
  | { type: "SET_GROUPS"; payload: Group[] };

interface State {
  user: User | undefined;
  groups: Group[];
}

interface GlobalStoreContextType extends State {
  store: Store;
  setUser: (user: User | undefined) => void;
  setGroups: (groups: Group[]) => void;
}

const initialState: State = {
  user: undefined,
  groups: [],
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload };
    case "SET_GROUPS":
      return { ...state, groups: action.payload };
    default:
      return state;
  }
};

const GlobalStoreContext = createContext<GlobalStoreContextType | undefined>(
  undefined
);

export const GlobalStoreProvider = (props: { children: React.ReactNode }) => {
  const { children } = props;
  const [state, dispatch] = useReducer(reducer, initialState);

  const store = useMemo(() => new Store(), []);

  useEffect(() => {
    return () => {
      store.close();
    };
  }, [store]);

  const setUser = useCallback((user: User | undefined) => {
    dispatch({ type: "SET_USER", payload: user });
  }, []);

  const setGroups = useCallback((groups: Group[]) => {
    dispatch({ type: "SET_GROUPS", payload: groups });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setUser,
      setGroups,
      store,
    }),
    [state, setUser, setGroups, store]
  );

  return (
    <GlobalStoreContext.Provider value={value}>
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
