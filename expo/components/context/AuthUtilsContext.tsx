import { Group, User } from "@/types/types";
import http from "@/util/custom-axios";
import { save, clear } from "@/util/custom-store";
import axios from "axios";
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
  const { user, setUser } = useGlobalStore();
  const { children } = props;

  const whoami = async (forceRefresh?: boolean): Promise<User | undefined> => {
    console.log("existing user", user);
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
          if (error.message != "canceled") {
            console.error("whoami error:", error);
          }
        });
      console.log("loggedInUser", loggedInUser);
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
      })
      .catch((error) => {
        console.error("error signing up", error);
      });
  };

  return (
    <AuthUtilsContext.Provider
      value={{ whoami: whoami, login: login, logout: logout, signup: signup }}
    >
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
