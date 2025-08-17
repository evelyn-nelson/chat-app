import { User } from "@/types/types";
import http from "@/util/custom-axios";
import { save, clear } from "@/util/custom-store";
import axios, { CanceledError } from "axios";
import React, { createContext, useContext, useCallback } from "react";
import { useGlobalStore } from "./GlobalStoreContext";
import { useWebSocket } from "./WebSocketContext";
import { router } from "expo-router";
import { useMessageStore } from "./MessageStoreContext";

import * as deviceService from "@/services/deviceService";
import * as encryptionService from "@/services/encryptionService";

interface AuthUtilsContextType {
  whoami: (forceRefresh?: boolean) => Promise<WhoAmIResult>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
}
interface WhoAmIResult {
  user: User | undefined;
  deviceId: string | undefined;
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

  const whoami = useCallback(
    async (forceRefresh?: boolean): Promise<WhoAmIResult> => {
      try {
        let currentDeviceId = globalDeviceId;
        if (!currentDeviceId) {
          const id = await deviceService.getOrGenerateDeviceIdentifier();
          setDeviceId(id);
          currentDeviceId = id;
        }

        if (!user || forceRefresh) {
          const response = await http.get<User>(
            `${process.env.EXPO_PUBLIC_HOST}/api/users/whoami`
          );
          const loggedInUser = response.data;
          setUser(loggedInUser);
          if (loggedInUser && !connected) {
            establishConnection().catch(() => {});
          }
          return { user: loggedInUser, deviceId: currentDeviceId };
        }
        if (user && !connected) {
          establishConnection().catch(() => {});
        }
        return { user: user, deviceId: globalDeviceId };
      } catch (error) {
        if (!(error instanceof CanceledError)) {
          // Avoid causing auth flicker when a connection is racing/bootstrapping
          const message = (error as Error).message || "";
          const isTransient =
            message.includes("Connection attempt already in progress") ||
            message.includes("WebSocket closed (Code: 0)");
          if (!isTransient) {
            console.error("Error in whoami:", error);
          }
        }
        return { user, deviceId: globalDeviceId };
      }
    },
    [globalDeviceId, setDeviceId, user, setUser, connected, establishConnection]
  );

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
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

        const { deviceId: currentDeviceId } = await whoami(true);
        router.replace({ pathname: "/(app)" });
        await loadHistoricalMessages(currentDeviceId);
      } catch (error) {
        console.error("Error signing in:", error);
        throw error;
      }
    },
    [setDeviceId, whoami, loadHistoricalMessages]
  );

  const signup = useCallback(
    async (
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
    },
    [setDeviceId, whoami, loadHistoricalMessages]
  );

  const logout = useCallback(async () => {
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
  }, [setUser, setDeviceId, connected, disconnect]);

  return (
    <AuthUtilsContext.Provider value={{ whoami, login, logout, signup }}>
      {children}
    </AuthUtilsContext.Provider>
  );
};

export const useAuthUtils = () => {
  const context = useContext(AuthUtilsContext);
  if (!context) {
    throw new Error("useAuthUtils must be used within an AuthUtilsProvider");
  }
  return context;
};
