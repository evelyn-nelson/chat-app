import { Message, Group, User } from "@/types/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface WebSocketContextType {
  sendMessage: (msg: string) => void;
  connected: boolean;
  messages: Message[];
  onMessage: (callback: (message: Message) => void) => void;
  removeMessageHandler: (callback: (message: Message) => void) => void;
  createGroup: (name: string, user: User) => Promise<Group | undefined>;
  joinGroup: (groupID: string, user: User) => Promise<void>;
  leaveGroup: () => void;
  getGroups: () => Promise<Group[]>;
  getUsers: (groupID: string) => Promise<User[]>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

const baseURL = "localhost:8080/ws";

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messageHandlersRef = useRef<((message: Message) => void)[]>([]);

  const isUser = (data: any): data is User => {
    return typeof data.id === "number" && typeof data.username === "string";
  };

  const isUsersArray = (data: any): data is User[] => {
    return Array.isArray(data) && data.every((item) => isUser(item));
  };

  const isGroup = (data: any): data is Group => {
    return typeof data.id === "number" && typeof data.name === "string";
  };

  const isGroupArray = (data: any): data is Group[] => {
    return Array.isArray(data) && data.every((item) => isGroup(item));
  };

  const createGroup = async (name: string, user: User) => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    const httpURL = `http://${baseURL}/createGroup`;
    try {
      const response = await fetch(httpURL, {
        method: "POST",
        body: JSON.stringify({
          name: name,
          username: user.username,
        }),
      });
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const data = await response.json();
      if (!isGroup(data)) {
        throw new Error("Invalid data format");
      }
      return data;
    } catch (error) {
      console.error(error);
      return;
    }
  };

  const joinGroup = (groupID: string, user: User): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      const wsURL = `ws://${baseURL}/joinGroup/${groupID}?userID=${1}&username=${encodeURIComponent(user.username)}`;
      const socket = new WebSocket(wsURL);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connected to group:", groupID);
        setConnected(true);
        resolve();
      };

      socket.onmessage = (event) => {
        try {
          const content = JSON.parse(event.data).content;
          const parsedMessage = JSON.parse(content);
          setMessages((prevMessages) => [...prevMessages, parsedMessage]);
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

      socket.onclose = () => {
        console.log("WebSocket closed");
        setConnected(false);
      };

      socket.onerror = (error) => {
        console.log("WebSocket error: ", error);
        reject();
      };
    });
  };

  const leaveGroup = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
  };

  const getGroups = async (): Promise<Group[]> => {
    try {
      const response = await fetch(`http://${baseURL}/getGroups`);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const data = await response.json();
      if (!isGroupArray(data)) {
        throw new Error("Invalid data format");
      }
      return data as Group[];
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const getUsers = async (groupID: string) => {
    try {
      const response = await fetch(
        `http://${baseURL}/getUsersInGroup/${groupID}`
      );
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const data = await response.json();
      if (!isUsersArray(data)) {
        throw new Error("Invalid data format");
      }
      return data as User[];
    } catch (error) {
      console.error(error);
      return [];
    }
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
    if (messageHandlersRef.current.includes(handler)) {
      return;
    }
    messageHandlersRef.current = [...messageHandlersRef.current, handler];
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
        messages,
        onMessage,
        removeMessageHandler,
        createGroup,
        joinGroup,
        leaveGroup,
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
