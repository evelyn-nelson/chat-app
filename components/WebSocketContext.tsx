import { Message, Room, User } from "@/types/types";
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
  createRoom: (name: string, user: User) => Promise<Room | undefined>;
  joinRoom: (roomID: string, user: User) => void;
  leaveRoom: () => void;
  getRooms: () => Promise<Room[]>;
  getUsers: (roomID: string) => Promise<User[]>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

const baseURL = "192.168.1.32:8080/ws";

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageHandlers, setMessageHandlers] = useState<
    ((message: Message) => void)[]
  >([]);

  const isUser = (data: any): data is User => {
    return typeof data.id === "string" && typeof data.username === "string";
  };

  const isUsersArray = (data: any): data is User[] => {
    return Array.isArray(data) && data.every((item) => isUser(item));
  };

  const isRoom = (data: any): data is Room => {
    return (
      typeof data.id === "string" &&
      typeof data.name === "string" &&
      typeof data.admin.username === "string"
    );
  };

  const isRoomArray = (data: any): data is Room[] => {
    console.log(data);
    return Array.isArray(data) && data.every((item) => isRoom(item));
  };

  const createRoom = async (name: string, user: User) => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    const httpURL = `http://${baseURL}/createRoom`;
    try {
      const response = await fetch(httpURL, {
        method: "POST",
        body: JSON.stringify({
          name: name,
          user: user,
        }),
      });
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const data = await response.json();
      if (!isRoom(data)) {
        throw new Error("Invalid data format");
      }
      return data;
    } catch (error) {
      console.error(error);
      return;
    }
  };

  const joinRoom = (roomID: string, user: User) => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    const wsURL = `ws://${baseURL}/joinRoom/${roomID}?userID=${Math.floor(Math.random() * 2000)}&username=${encodeURIComponent(user.username)}`;
    const socket = new WebSocket(wsURL);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected to room:", roomID);
      setConnected(true);
    };

    socket.onmessage = (event) => {
      let parsedMessage: Message;
      try {
        parsedMessage = JSON.parse(event.data);
        setMessages((prevMessages) => [...prevMessages, parsedMessage]);
      } catch (error) {
        parsedMessage = { user: { username: "Anonymous" }, msg: event.data };
        console.error("Error parsing JSON: ", error);
        setMessages((prevMessages) => [...prevMessages, parsedMessage]);
      }
      messageHandlers.forEach((handler) => handler(parsedMessage));
    };

    socket.onclose = () => {
      console.log("WebSocket closed");
      setConnected(false);
    };

    socket.onerror = (error) => {
      console.log("WebSocket error: ", error);
    };
  };

  const leaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
  };

  const getRooms = async (): Promise<Room[]> => {
    try {
      const response = await fetch(`http://${baseURL}/getRooms`);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const data = await response.json();
      if (!isRoomArray(data)) {
        throw new Error("Invalid data format");
      }
      return data as Room[];
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const getUsers = async (roomID: string) => {
    try {
      const response = await fetch(`http://${baseURL}/getClients/${roomID}`);
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
      socket.send(msg);
    } else {
      console.error("Socket is not open.");
    }
  };

  const onMessage = useCallback((callback: (message: Message) => void) => {
    setMessageHandlers((prevHandlers) => {
      if (prevHandlers.includes(callback)) return prevHandlers; // Avoid duplicate handlers
      return [...prevHandlers, callback];
    });
  }, []);

  const removeMessageHandler = useCallback(
    (callback: (message: Message) => void) => {
      setMessageHandlers((prevHandlers) =>
        prevHandlers.filter((handler) => handler !== callback)
      );
    },
    []
  );

  useEffect(() => {
    // Cleanup WebSocket on component unmount
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
        createRoom,
        joinRoom,
        leaveRoom,
        getRooms,
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
