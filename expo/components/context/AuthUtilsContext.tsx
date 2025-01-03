import { Group, User } from "@/types/types";
import http from "@/util/custom-axios";
import { save, clear } from "@/util/custom-store";
import axios, { CanceledError } from "axios";
import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useReducer,
  useState,
} from "react";
import { useGlobalStore } from "./GlobalStoreContext";
import { useWebSocket } from "./WebSocketContext";
import { router } from "expo-router";
import { useMessageStore } from "./MessageStoreContext";

interface AuthUtilsContextType {
  whoami: (forceRefresh?: boolean) => Promise<User | undefined>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
}

const AuthUtilsContext = createContext<AuthUtilsContextType | undefined>(
  undefined
);

export const AuthUtilsProvider = (props: { children: React.ReactNode }) => {
  const { establishConnection, disconnect } = useWebSocket();
  const { loadHistoricalMessages } = useMessageStore();

  const { user, setUser } = useGlobalStore();
  const { children } = props;

  const whoami = async (forceRefresh?: boolean): Promise<User | undefined> => {
    if (!user || forceRefresh) {
      const loggedInUser = await http
        .get(`http://${process.env.EXPO_PUBLIC_HOST}/api/users/whoami`)
        .then((response) => {
          const { data } = response;
          setUser({
            ...data,
          });
          return data;
        })
        .catch((error) => {
          if (!(error instanceof CanceledError)) {
            console.error("whoami error:", error);
          }
        });
      return loggedInUser;
    }
    return user;
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await axios.post(
        `http://${process.env.EXPO_PUBLIC_HOST}/auth/login`,
        {
          email: email,
          password: password,
        }
      );

      const { data } = response;
      await save("jwt", data.token);
      await establishConnection();
      await whoami(true);
      await loadHistoricalMessages();
    } catch (error) {
      console.error("error signing in", error);
    }
  };

  const logout = async () => {
    await clear("jwt");
    await disconnect();
    router.replace({ pathname: "/signin" });
  };

  const signup = async (
    username: string,
    email: string,
    password: string
  ): Promise<void> => {
    axios
      .post(`http://${process.env.EXPO_PUBLIC_HOST}/auth/signup`, {
        username: username,
        email: email,
        password: password,
      })
      .then(async (response) => {
        const { data } = response;
        await save("jwt", data.token);
        await establishConnection();
        await whoami(true);
        await loadHistoricalMessages();
      })
      .catch((error) => {
        console.error("error signing up", error);
      });
  };

  return (
    <AuthUtilsContext.Provider value={{ whoami, login, logout, signup }}>
      {children}
    </AuthUtilsContext.Provider>
  );
};

export const useAuthUtils = () => {
  const context = useContext(AuthUtilsContext);
  if (!context) {
    throw new Error("useAuthUtils must be used within a AuthUtils");
  }
  return context;
};
