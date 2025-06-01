import {
  // We will use RawMessage for WebSocket communication.
  // The client-side 'Message' (with Uint8Array) is handled by subscribers.
  RawMessage,
  Group,
  User,
  // UserGroup, // Not directly used in this file's public interface
  UpdateGroupParams,
  CreateGroupParams,
} from "@/types/types"; // Ensure RawMessage is correctly imported
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import http from "../../util/custom-axios"; // Assuming this path is correct
import { get } from "@/util/custom-store"; // Assuming this path is correct
import { CanceledError } from "axios";

interface WebSocketContextType {
  // sendMessage now takes a RawMessage (the E2EE packet for transport)
  sendMessage: (packet: RawMessage) => void;
  connected: boolean;
  // onMessage callback now provides a RawMessage
  onMessage: (callback: (packet: RawMessage) => void) => void;
  // removeMessageHandler callback now matches the new onMessage signature
  removeMessageHandler: (callback: (packet: RawMessage) => void) => void;
  establishConnection: () => Promise<void>;
  disconnect: () => void;
  createGroup: (
    name: string,
    startTime: Date,
    endTime: Date,
    description?: string | null,
    location?: string | null,
    imageUrl?: string | null
  ) => Promise<Group | undefined>;
  updateGroup: (
    id: string,
    updateParams: UpdateGroupParams
  ) => Promise<Group | undefined>;
  inviteUsersToGroup: (emails: string[], group_id: string) => void;
  removeUserFromGroup: (email: string, group_id: string) => void;
  leaveGroup: (group_id: string) => void;
  getGroups: () => Promise<Group[]>;
  getUsers: () => Promise<User[]>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

const httpBaseURL = `${process.env.EXPO_PUBLIC_HOST}/ws`;
const wsBaseURL = `${process.env.EXPO_PUBLIC_WS_HOST}/ws`;

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;

const CLOSE_CODE_AUTH_FAILED = 4001;
const CLOSE_CODE_UNAUTHENTICATED = 4003;
let preventRetries = false;

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const messageHandlersRef = useRef<((packet: RawMessage) => void)[]>([]);
  const isReconnecting = useRef(false);

  const createGroup = async (
    name: string,
    startTime: Date,
    endTime: Date,
    description?: string | null,
    location?: string | null,
    imageUrl?: string | null
  ): Promise<Group | undefined> => {
    const httpURL = `${httpBaseURL}/createGroup`;
    const payload: CreateGroupParams = {
      name,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      ...(description !== undefined && { description }),
      ...(location !== undefined && { location }),
      ...(imageUrl !== undefined && { image_url: imageUrl }),
    };
    return http
      .post(httpURL, payload)
      .then((response) => response.data)
      .catch((error) => {
        console.error("Error creating group:", error);
        return undefined;
      });
  };

  const updateGroup = async (
    id: string,
    updateParams: UpdateGroupParams
  ): Promise<Group | undefined> => {
    const httpURL = `${httpBaseURL}/updateGroup/${id}`;
    if (
      !Object.values(updateParams).some(
        (value) => value !== undefined && value !== null
      )
    ) {
      console.error("Invalid update input: No parameters provided.");
      return undefined;
    }
    return http
      .put(httpURL, updateParams)
      .then((response) => response.data)
      .catch((error) => {
        console.error("Error updating group:", error);
        return undefined;
      });
  };

  const establishConnection = (): Promise<void> => {
    let promiseSettled = false;
    preventRetries = false;
    let currentAttemptPreventRetries = false;

    return new Promise(async (resolve, reject) => {
      const token = await get("jwt");
      if (!token) {
        if (!promiseSettled) {
          promiseSettled = true;
          reject(new Error("Authentication token not found."));
        }
        return;
      }

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        if (!promiseSettled) {
          promiseSettled = true;
          resolve();
        }
        return;
      }

      if (isReconnecting.current) {
        console.log("Connection attempt already in progress.");
        if (!promiseSettled) {
          reject(new Error("Connection attempt already in progress."));
        }
        return;
      }

      isReconnecting.current = true;
      currentAttemptPreventRetries = false;

      const wsURL = `${wsBaseURL}/establishConnection`;
      let retryCount = 0;
      let isAuthenticated = false;

      const cleanup = (reason?: string) => {
        if (socketRef.current) {
          const ws = socketRef.current;
          socketRef.current = null;
          ws.onopen = null;
          ws.onmessage = null;
          ws.onclose = null;
          ws.onerror = null;
          if (
            ws.readyState !== WebSocket.CLOSING &&
            ws.readyState !== WebSocket.CLOSED
          ) {
            ws.close(1000, `Client cleanup: ${reason || "Normal"}`);
          }
        }
        isAuthenticated = false;
        setConnected(false);
      };

      const safeReject = (error: Error) => {
        if (!promiseSettled) {
          promiseSettled = true;
          reject(error);
        }
        isReconnecting.current = false;
        currentAttemptPreventRetries = true;
        if (socketRef.current) {
          cleanup(error.message);
        } else {
          isAuthenticated = false;
          setConnected(false);
        }
      };

      const connect = () => {
        if (currentAttemptPreventRetries || preventRetries) {
          console.log("Retries prevented for current connection flow.");
          isReconnecting.current = false;
          if (!promiseSettled && !isAuthenticated) {
            safeReject(new Error("Connection retries aborted."));
          }
          return;
        }

        if (socketRef.current) {
          const oldSocket = socketRef.current;
          socketRef.current = null;

          oldSocket.onopen = null;
          oldSocket.onmessage = null;
          oldSocket.onclose = null;
          oldSocket.onerror = null;
          if (
            oldSocket.readyState !== WebSocket.CLOSING &&
            oldSocket.readyState !== WebSocket.CLOSED
          ) {
            oldSocket.close(
              1000,
              "Client cleanup: Starting new connection attempt"
            );
          }
        }

        const socket = new WebSocket(wsURL);
        socketRef.current = socket;

        socket.onopen = () => {
          if (socketRef.current !== socket) return;
          try {
            socket.send(JSON.stringify({ type: "auth", token: token }));
          } catch (error) {
            safeReject(new Error("Failed to send authentication message."));
            socket.close(CLOSE_CODE_AUTH_FAILED, "Failed to send auth");
          }
        };

        socket.onmessage = (event) => {
          if (socketRef.current !== socket) return;
          try {
            const parsedData = JSON.parse(event.data as string);

            if (!isAuthenticated) {
              if (parsedData.type === "auth_success") {
                isAuthenticated = true;
                setConnected(true);
                isReconnecting.current = false;
                retryCount = 0;
                preventRetries = false;
                if (!promiseSettled) {
                  promiseSettled = true;
                  resolve();
                }
              } else if (parsedData.type === "auth_failure") {
                preventRetries = true;
                safeReject(
                  new Error(
                    `Authentication failed: ${parsedData.error || "Unknown reason"}`
                  )
                );
                socket.close(CLOSE_CODE_AUTH_FAILED, "Authentication Failed");
              } else {
                preventRetries = true;
                safeReject(
                  new Error(
                    "Received unexpected message during authentication phase."
                  )
                );
              }
            } else {
              if (
                parsedData.groupId &&
                parsedData.ciphertext &&
                parsedData.envelopes &&
                Array.isArray(parsedData.envelopes)
              ) {
                messageHandlersRef.current.forEach((handler) => {
                  try {
                    handler(parsedData as RawMessage);
                  } catch (handlerError) {
                    console.error("Error in message handler:", handlerError);
                  }
                });
              } else if (parsedData.type && parsedData.type === "error") {
                console.error(
                  "Received operational error from server:",
                  parsedData.message
                );
              } else {
                console.warn(
                  "Received non-message data or malformed E2EE packet after auth:",
                  parsedData
                );
              }
            }
          } catch (error) {
            console.error(
              "Error parsing WebSocket message or in handler:",
              error
            );
          }
        };

        socket.onclose = (event) => {
          if (socketRef.current !== socket && socketRef.current !== null) {
            return;
          }
          const wasCurrentSocket = socketRef.current === socket;

          if (wasCurrentSocket) {
            socketRef.current = null;
          }

          if (wasCurrentSocket || !socketRef.current) {
            setConnected(false);
          }

          if (
            currentAttemptPreventRetries ||
            preventRetries ||
            event.code === 1000 ||
            event.code === CLOSE_CODE_AUTH_FAILED ||
            event.code === CLOSE_CODE_UNAUTHENTICATED
          ) {
            isReconnecting.current = false;
            if (!promiseSettled && !isAuthenticated && event.code !== 1000) {
              promiseSettled = true;
              reject(
                new Error(
                  `WebSocket closed (Code: ${event.code}) before authentication completed.`
                )
              );
            }
            return;
          }

          retryCount++;
          if (retryCount <= MAX_RETRIES) {
            const delay = Math.min(
              INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1) +
                Math.random() * 1000,
              MAX_RETRY_DELAY
            );
            console.log(
              `WebSocket closed unexpectedly. Retrying in ${delay.toFixed(0)}ms... (Attempt ${retryCount})`
            );
            setTimeout(connect, delay);
          } else {
            isReconnecting.current = false;
            console.error("WebSocket connection failed after maximum retries.");
            if (!promiseSettled) {
              promiseSettled = true;
              reject(
                new Error("WebSocket connection failed after maximum retries")
              );
            }
          }
        };

        socket.onerror = (event) => {
          if (socketRef.current !== socket) return;
          console.error("WebSocket error:", event);
        };
      };
      connect();
    });
  };

  const leaveGroup = async (group_id: string) => {
    return http.post(`${httpBaseURL}/leaveGroup/${group_id}`).catch((error) => {
      console.error("Error leaving group:", error);
    });
  };

  const disconnect = () => {
    preventRetries = true;
    isReconnecting.current = false;
    if (socketRef.current) {
      socketRef.current.close(1000, "User initiated disconnect");
    }
  };

  const inviteUsersToGroup = async (
    emails: string[],
    group_id: string
  ): Promise<any> => {
    // TODO: define a more specific return type
    return http
      .post(`${httpBaseURL}/inviteUsersToGroup`, {
        group_id: group_id,
        emails: emails,
      })
      .catch((error) => {
        console.error("Error inviting users:", error);
      });
  };

  const removeUserFromGroup = async (
    email: string,
    group_id: string
  ): Promise<any> => {
    // TODO: define a more specific return type
    return http
      .post(`${httpBaseURL}/removeUserFromGroup`, {
        group_id: group_id,
        email: email,
      })
      .catch((error) => {
        console.error("Error removing user:", error);
      });
  };

  const getGroups = async (): Promise<Group[]> => {
    return http
      .get(`${httpBaseURL}/getGroups`)
      .then((response) => response.data)
      .catch((error) => {
        if (!(error instanceof CanceledError)) {
          console.error("Error loading groups:", error);
        }
        return [];
      });
  };

  const getUsers = async (): Promise<User[]> => {
    return http
      .get(`${httpBaseURL}/relevantUsers`)
      .then((response) => response.data)
      .catch((error) => {
        if (!(error instanceof CanceledError)) {
          console.error("Error loading relevant users:", error);
        }
        return [];
      });
  };

  const sendMessage = useCallback(
    (packet: RawMessage) => {
      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN && connected) {
        try {
          socket.send(JSON.stringify(packet));
        } catch (error) {
          console.error("Error sending message:", error);
        }
      } else {
        console.error(
          "WebSocket is not connected or not authenticated. Message not sent."
        );
      }
    },
    [connected]
  );

  const onMessage = useCallback((callback: (packet: RawMessage) => void) => {
    if (!messageHandlersRef.current.includes(callback)) {
      messageHandlersRef.current = [...messageHandlersRef.current, callback];
    }
  }, []);

  const removeMessageHandler = useCallback(
    (callback: (packet: RawMessage) => void) => {
      messageHandlersRef.current = messageHandlersRef.current.filter(
        (h) => h !== callback
      );
    },
    []
  );

  useEffect(() => {
    preventRetries = false;
    return () => {
      preventRetries = true;
      isReconnecting.current = false;
      if (socketRef.current) {
        const wsToClose = socketRef.current;
        socketRef.current = null;
        wsToClose.onclose = null;
        wsToClose.close(1000, "Component unmounting");
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        sendMessage,
        connected,
        onMessage,
        removeMessageHandler,
        establishConnection,
        disconnect,
        createGroup,
        updateGroup,
        leaveGroup,
        inviteUsersToGroup,
        removeUserFromGroup,
        getGroups,
        getUsers,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
