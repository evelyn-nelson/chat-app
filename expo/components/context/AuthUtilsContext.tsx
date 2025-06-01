import { User } from "@/types/types";
import http from "@/util/custom-axios";
import { save, clear } from "@/util/custom-store";
import axios, { CanceledError } from "axios";
import React, {
  createContext,
  useContext, // Removed unused Dispatch, SetStateAction
} from "react";
import { useGlobalStore } from "./GlobalStoreContext";
import { useWebSocket } from "./WebSocketContext";
import { router } from "expo-router";
import { useMessageStore } from "./MessageStoreContext";

import * as deviceService from "@/services/deviceService";
import * as encryptionService from "@/services/encryptionService";

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
  const { establishConnection, disconnect, connected } = useWebSocket();
  const { loadHistoricalMessages } = useMessageStore();
  const {
    user,
    setUser,
    setDeviceId,
    deviceId: globalDeviceId,
  } = useGlobalStore();
  const { children } = props;

  const whoami = async (forceRefresh?: boolean): Promise<User | undefined> => {
    try {
      if (!globalDeviceId) {
        const id = await deviceService.getOrGenerateDeviceIdentifier();
        console.log("id", id);
        setDeviceId(id);
      }

      if (!user || forceRefresh) {
        const response = await http.get<User>(
          `${process.env.EXPO_PUBLIC_HOST}/api/users/whoami`
        );
        const loggedInUser = response.data;
        setUser(loggedInUser);
        if (loggedInUser && !connected) {
          await establishConnection();
        }
        return loggedInUser;
      }
      if (user && !connected) {
        await establishConnection();
      }
      return user;
    } catch (error) {
      if (!(error instanceof CanceledError)) {
        console.error("Error in whoami:", error);
      }
      return undefined;
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const { deviceId, publicKey } =
        await deviceService.ensureDeviceIdentity();

      const base64PublicKey = encryptionService.uint8ArrayToBase64(publicKey);

      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_HOST}/auth/login`,
        {
          email: email,
          password: password,
          device_identifier: deviceId,
          public_key: base64PublicKey,
        }
      );
      const { data } = response;
      await save("jwt", data.token);
      setDeviceId(deviceId);

      await whoami(true);
      router.replace({ pathname: "/(app)" });
      await loadHistoricalMessages();
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const signup = async (
    username: string,
    email: string,
    password: string
  ): Promise<void> => {
    try {
      const { deviceId, publicKey } =
        await deviceService.ensureDeviceIdentity();

      const base64PublicKey = encryptionService.uint8ArrayToBase64(publicKey);

      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_HOST}/auth/signup`,
        {
          username: username,
          email: email,
          password: password,
          device_identifier: deviceId,
          public_key: base64PublicKey,
        }
      );
      const { data } = response;
      await save("jwt", data.token);
      setDeviceId(deviceId);

      await whoami(true);
      router.replace({ pathname: "/(app)" });
      await loadHistoricalMessages();
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await clear("jwt");
      setUser(undefined);
      setDeviceId(undefined);
      if (connected) {
        await disconnect();
      }
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      router.replace({ pathname: "/(auth)" });
    }
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
    throw new Error("useAuthUtils must be used within an AuthUtilsProvider"); // Corrected provider name
  }
  return context;
};
