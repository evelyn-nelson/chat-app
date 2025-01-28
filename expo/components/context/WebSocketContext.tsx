import { Message, Group, User, UserGroup } from "@/types/types";
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

interface WebSocketContextType {
  sendMessage: (msg: string) => void;
  connected: boolean;
  onMessage: (callback: (message: Message) => void) => void;
  removeMessageHandler: (callback: (message: Message) => void) => void;
  establishConnection: () => Promise<void>;
  disconnect: () => void;
  createGroup: (name: string) => Promise<Group | undefined>;
  inviteUsersToGroup: (emails: string[], group_id: number) => void;
  removeUserFromGroup: (email: string, group_id: number) => void;
  leaveGroup: (group_id: number) => void;
  getGroups: () => Promise<Group[]>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

const baseURL = `${process.env.EXPO_PUBLIC_HOST}/ws`;

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const messageHandlersRef = useRef<((message: Message) => void)[]>([]);
  const isReconnecting = useRef(false);

  const createGroup = async (name: string): Promise<Group | undefined> => {
    const httpURL = `http://${baseURL}/createGroup`;

    const group = http
      .post(httpURL, {
        name: name,
      })
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
    return new Promise(async (resolve, reject) => {
      const token = await get("jwt");
      if (!token) {
        return;
      }
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (isReconnecting.current) {
        console.log("Already reconnecting, waiting for existing connection...");
        return;
      }

      isReconnecting.current = true;

      const wsURL = `ws://${baseURL}/establishConnection/${token}`;

      let retryCount = 0;
      const MAX_RETRIES = 5;
      const INITIAL_RETRY_DELAY = 1000;

      const cleanup = () => {
        if (socketRef.current) {
          socketRef.current.onclose = null;
          socketRef.current.onerror = null;
          socketRef.current.onmessage = null;
          socketRef.current.onopen = null;
          socketRef.current.close(1000);
        }
      };

      const connect = () => {
        cleanup();

        const socket = new WebSocket(wsURL);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log("WebSocket connected");
          setConnected(true);
          isReconnecting.current = false;
          retryCount = 0;
          resolve();
        };

        socket.onmessage = (event) => {
          try {
            const parsedMessage = JSON.parse(event.data);
            const currentHandlers = messageHandlersRef.current;
            currentHandlers.forEach((handler, index) => {
              try {
                handler(parsedMessage);
              } catch (handlerError) {
                console.error(`Error in handler ${index}:`, handlerError);
              }
            });
          } catch (error) {
            console.error("Error in onmessage:", error);
          }
        };

        socket.onclose = (event) => {
          console.log("WebSocket closed", event);
          setConnected(false);

          if (event.code === 1000 || event.code === 401) {
            isReconnecting.current = false;
            return;
          }

          retryCount++;
          if (retryCount < MAX_RETRIES) {
            const delay = Math.min(
              INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1),
              60000
            );
            console.log(
              `Retrying connection in ${delay} ms... (Attempt ${retryCount} of ${MAX_RETRIES})`
            );
            setTimeout(connect, delay);
          } else {
            console.error("Failed to establish connection after retries");
            isReconnecting.current = false;
            reject(
              new Error("WebSocket connection failed after maximum retries")
            );
          }
        };

        socket.onerror = (error) => {
          console.log("WebSocket error: ", error);
        };
      };
      connect();
    });
  };

  const leaveGroup = async (group_id: number) => {
    http.post(`http://${baseURL}/leaveGroup/${group_id}`).catch((error) => {
      console.error(error);
    });
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.close(1000);
    }
  };

  const inviteUsersToGroup = async (emails: string[], group_id: number) => {
    http
      .post(`http://${baseURL}/inviteUsersToGroup`, {
        group_id: group_id,
        emails: emails,
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const removeUserFromGroup = async (email: string, group_id: number) => {
    http
      .post(`http://${baseURL}/removeUserToGroup`, {
        group_id: group_id,
        email: email,
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const getGroups = async (): Promise<Group[]> => {
    const groups = http
      .get(`http://${baseURL}/getGroups`)
      .then((response) => {
        const { data } = response;
        return data;
      })
      .catch((error) => {
        console.error(error);
        return [];
      });
    return groups;
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
        leaveGroup,
        inviteUsersToGroup,
        removeUserFromGroup,
        getGroups,
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
