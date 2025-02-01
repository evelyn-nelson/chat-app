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
  | { type: "TRIGGER_GROUPS_REFRESH" }
  | { type: "TRIGGER_USERS_REFRESH" };

interface State {
  user: User | undefined;
  groupsRefreshKey: number;
  usersRefreshKey: number;
}

interface GlobalStoreContextType extends State {
  store: Store;
  setUser: (user: User | undefined) => void;
  refreshGroups: () => void;
  refreshUsers: () => void;
}

const initialState: State = {
  user: undefined,
  groupsRefreshKey: 0,
  usersRefreshKey: 0,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload };
    case "TRIGGER_GROUPS_REFRESH":
      return { ...state, groupsRefreshKey: state.groupsRefreshKey + 1 };
    case "TRIGGER_USERS_REFRESH":
      return { ...state, usersRefreshKey: state.usersRefreshKey + 1 };
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
      store.close(); // probably want to get rid of this eventually? sorta defeats the purpose of the store
    };
  }, [store]);

  const setUser = useCallback((user: User | undefined) => {
    dispatch({ type: "SET_USER", payload: user });
  }, []);

  const refreshGroups = () => {
    dispatch({ type: "TRIGGER_GROUPS_REFRESH" });
  };

  const refreshUsers = () => {
    dispatch({ type: "TRIGGER_USERS_REFRESH" });
  };

  const value = useMemo(
    () => ({
      ...state,
      setUser,
      refreshGroups,
      refreshUsers,
      store,
    }),
    [state, setUser, refreshGroups, refreshUsers, store]
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
