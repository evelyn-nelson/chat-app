import { User } from "@/types/types";
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useWebSocket } from "./WebSocketContext";
import http from "@/util/custom-axios";
import { useGlobalStore } from "./GlobalStoreContext";
import { CanceledError } from "axios";

type UserAction =
  | { type: "SET_USERS"; payload: User[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
}

interface UserStoreContextType {
  loadUsers: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  users: [],
  loading: false,
  error: null,
};

const userReducer = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case "SET_USERS": {
      return {
        ...state,
        users: action.payload,
      };
    }

    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    default:
      return state;
  }
};

const UserStoreContext = createContext<UserStoreContextType | undefined>(
  undefined
);

export const UserStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(userReducer, initialState);
  const { store } = useGlobalStore();

  const loadUsers = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await http.get(
        `http://${process.env.EXPO_PUBLIC_HOST}/ws/relevantUsers`
      );
      await store.clearUsers();
      await store.saveUsers(response.data);
      dispatch({ type: "SET_USERS", payload: response.data });
      dispatch({ type: "SET_ERROR", payload: null });
    } catch (error) {
      if (!(error instanceof CanceledError)) {
        try {
          const users = await store.loadUsers();
          dispatch({ type: "SET_USERS", payload: users });
        } catch (storeError) {
          console.error("Failed to load users:", storeError);
          dispatch({ type: "SET_ERROR", payload: "Failed to load users" });
        }
      }
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  const value = useMemo(
    () => ({
      loading: state.loading,
      error: state.error,
      loadUsers,
    }),
    [loadUsers, state.loading, state.error]
  );

  return (
    <UserStoreContext.Provider value={value}>
      {children}
    </UserStoreContext.Provider>
  );
};

export const useUserStore = () => {
  const context = useContext(UserStoreContext);
  if (!context) {
    throw new Error("useUserStore must be used within a UserStoreProvider");
  }
  return context;
};
