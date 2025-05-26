import {
  Message,
  Group,
  User,
  UserGroup,
  UpdateGroupParams,
  CreateGroupParams,
} from "@/types/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import http from "../../util/custom-axios";
import { get } from "@/util/custom-store";
import { CanceledError } from "axios";

interface WebSocketContextType {
  sendMessage: (msg: string) => void;
  connected: boolean;
  onMessage: (callback: (message: Message) => void) => void;
  removeMessageHandler: (callback: (message: Message) => void) => void;
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

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const messageHandlersRef = useRef<((message: Message) => void)[]>([]);
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

    const group = http
      .post(httpURL, payload)
      .then((response) => {
        const { data } = response;
        return data;
      })
      .catch((error) => {
        console.error("error: ", error);
        return;
      });

    return group;
  };

  const updateGroup = async (
    id: string,
    updateParams: UpdateGroupParams
  ): Promise<Group | undefined> => {
    const httpURL = `${httpBaseURL}/updateGroup/${id}`;
    if (
      !(
        updateParams.name ||
        updateParams.start_time ||
        updateParams.end_time ||
        updateParams.description ||
        updateParams.location ||
        updateParams.image_url
      )
    ) {
      console.error("Invalid input");
      return undefined;
    }
    const group = http
      .put(httpURL, updateParams)
      .then((response) => {
        const { data } = response;
        return data;
      })
      .catch((error) => {
        console.error("error: ", error);
        return;
      });

    return group;
  };

  const establishConnection = (): Promise<void> => {
    let promiseSettled = false;
    let preventRetries = false;

    return new Promise(async (resolve, reject) => {
      const token = await get("jwt");
      if (!token) {
        console.error(
          "No JWT token found, cannot establish WebSocket connection."
        );
        if (!promiseSettled) {
          promiseSettled = true;
          reject(new Error("Authentication token not found."));
        }
        return;
      }

      if (socketRef.current?.readyState === WebSocket.OPEN && connected) {
        console.log("WebSocket already open and connected.");
        if (!promiseSettled) {
          promiseSettled = true;
          resolve();
        }
        return;
      }

      if (isReconnecting.current) {
        console.log("Already attempting connection/reconnection, waiting...");
        return;
      }

      console.log("Attempting to establish WebSocket connection...");
      isReconnecting.current = true;
      preventRetries = false;

      const wsURL = `${wsBaseURL}/establishConnection`;

      let retryCount = 0;
      let isAuthenticated = false;

      const cleanup = (reason?: string) => {
        if (socketRef.current) {
          const ws = socketRef.current;
          socketRef.current = null;
          console.log(
            `Cleaning up socket instance. Reason: ${reason || "N/A"}`
          );
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
        preventRetries = true;
        cleanup(error.message);
      };

      const connect = () => {
        if (socketRef.current) {
          cleanup("Starting new connection attempt");
        }

        console.log(`Connecting to ${wsURL}... (Attempt ${retryCount + 1})`);
        const socket = new WebSocket(wsURL);
        socketRef.current = socket;

        socket.onopen = () => {
          if (socketRef.current !== socket) {
            console.warn(
              "onopen triggered for an outdated socket instance. Ignoring."
            );
            return;
          }
          console.log(
            "WebSocket connection opened. Sending authentication message..."
          );
          try {
            socket.send(JSON.stringify({ type: "auth", token: token }));
          } catch (error) {
            console.error("Failed to send auth message:", error);
            safeReject(new Error("Failed to send authentication message."));
            socket.close(CLOSE_CODE_AUTH_FAILED, "Failed to send auth");
          }
        };

        socket.onmessage = (event) => {
          if (socketRef.current !== socket) {
            console.warn(
              "onmessage triggered for an outdated socket instance. Ignoring."
            );
            return;
          }
          try {
            const parsedMessage = JSON.parse(event.data);

            if (!isAuthenticated) {
              if (parsedMessage.type === "auth_success") {
                console.log("WebSocket authenticated successfully.");
                isAuthenticated = true;
                setConnected(true);
                isReconnecting.current = false;
                retryCount = 0;
                if (!promiseSettled) {
                  promiseSettled = true;
                  resolve();
                }
              } else if (parsedMessage.type === "auth_failure") {
                console.error(
                  "WebSocket authentication failed:",
                  parsedMessage.error || "No reason provided."
                );
                preventRetries = true;
                safeReject(
                  new Error(
                    `Authentication failed: ${parsedMessage.error || "Unknown reason"}`
                  )
                );
                socket.close(CLOSE_CODE_AUTH_FAILED, "Authentication Failed");
              } else {
                console.error(
                  "Received unexpected message before authentication:",
                  parsedMessage
                );
                preventRetries = true;
                safeReject(
                  new Error(
                    "Received unexpected message during authentication phase."
                  )
                );
                socket.close(
                  CLOSE_CODE_UNAUTHENTICATED,
                  "Unexpected message pre-auth"
                );
              }
            } else {
              messageHandlersRef.current.forEach((handler, index) => {
                try {
                  handler(parsedMessage);
                } catch (handlerError) {
                  console.error(
                    `Error in message handler ${index}:`,
                    handlerError
                  );
                }
              });
            }
          } catch (error) {
            console.error(
              "Error parsing WebSocket message or in handler:",
              error
            );
            safeReject(new Error("Failed to process incoming message."));
            socket.close(1011, "Message processing error");
          }
        };

        socket.onclose = (event) => {
          if (socketRef.current !== socket && socketRef.current !== null) {
            console.warn(
              `onclose triggered for an outdated socket instance (Code: ${event.code}). Ignoring.`
            );
            return;
          }

          console.log(
            `WebSocket closed. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`
          );
          cleanup(`onclose event (Code: ${event.code})`);

          if (preventRetries || event.code === 1000) {
            console.log("Retries prevented or connection closed normally.");
            isReconnecting.current = false;
            if (!promiseSettled && !isAuthenticated && event.code !== 1000) {
              safeReject(
                new Error(
                  `WebSocket closed unexpectedly (Code: ${event.code}) before authentication completed.`
                )
              );
            } else if (!promiseSettled && event.code === 1000) {
              safeReject(
                new Error(
                  `WebSocket closed normally (Code: 1000) before authentication completed.`
                )
              );
            }
            return;
          }

          // --- Retry Logic ---
          retryCount++;
          if (retryCount <= MAX_RETRIES) {
            // Exponential backoff with jitter and cap
            const delay = Math.min(
              INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1) +
                Math.random() * 1000,
              MAX_RETRY_DELAY
            );
            console.log(
              `Connection closed unexpectedly. Retrying connection in ${Math.round(delay)} ms... (Attempt ${retryCount} of ${MAX_RETRIES})`
            );
            setTimeout(connect, delay);
          } else {
            console.error("WebSocket connection failed after maximum retries.");
            isReconnecting.current = false;
            safeReject(
              new Error("WebSocket connection failed after maximum retries")
            );
          }
        };

        socket.onerror = (event) => {
          if (socketRef.current !== socket) {
            console.warn(
              "onerror triggered for an outdated socket instance. Ignoring."
            );
            return;
          }
          console.error("WebSocket error:", event);
        };
      };

      connect();
    });
  };

  const leaveGroup = async (group_id: string) => {
    http.post(`${httpBaseURL}/leaveGroup/${group_id}`).catch((error) => {
      console.error(error);
    });
  };

  const disconnect = () => {
    isReconnecting.current = false;
    if (socketRef.current) {
      socketRef.current.close(1000);
      socketRef.current = null;
    }
  };

  const inviteUsersToGroup = async (
    emails: string[],
    group_id: string
  ): Promise<any> => {
    return http
      .post(`${httpBaseURL}/inviteUsersToGroup`, {
        group_id: group_id,
        emails: emails,
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const removeUserFromGroup = async (
    email: string,
    group_id: string
  ): Promise<any> => {
    return http
      .post(`${httpBaseURL}/removeUserFromGroup`, {
        group_id: group_id,
        email: email,
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const getGroups = async (): Promise<Group[]> => {
    const groups = http
      .get(`${httpBaseURL}/getGroups`)
      .then((response) => {
        const { data } = response;
        return data;
      })
      .catch((error) => {
        if (!(error instanceof CanceledError)) {
          console.error("Error loading groups:", error);
        }
        return [];
      });
    return groups;
  };

  const getUsers = async (): Promise<User[]> => {
    const users = http
      .get(`${httpBaseURL}/relevantUsers`)
      .then((response) => {
        const { data } = response;
        return data;
      })
      .catch((error) => {
        if (!(error instanceof CanceledError)) {
          console.error("Error loading groups:", error);
        }
        return [];
      });
    return users;
  };

  const sendMessage = (msg: string) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(msg);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    } else {
      console.error("WebSocket is not initialized.");
    }
  };

  const onMessage = useCallback((handler: (message: Message) => void) => {
    if (!messageHandlersRef.current.includes(handler)) {
      messageHandlersRef.current = [...messageHandlersRef.current, handler];
    }
  }, []);

  const removeMessageHandler = useCallback(
    (handler: (message: Message) => void) => {
      messageHandlersRef.current = messageHandlersRef.current.filter(
        (h) => h !== handler
      );
    },
    []
  );

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
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
