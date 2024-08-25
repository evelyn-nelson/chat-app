import { Message, User } from "@/types/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { View, Text, Button } from "react-native";

interface WebSocketContextType {
  sendMessage: (msg: string) => void;
  connected: boolean;
  messages: Message[];
  onMessage: (callback: (message: Message) => void) => void;
  removeMessageHandler: (callback: (message: Message) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageHandlers, setMessageHandlers] = useState<
    ((message: Message) => void)[]
  >([]);

  useEffect(() => {
    const socket = new WebSocket("ws://192.168.1.12:8080/room");
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected");
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
    };

    socket.onerror = (error) => {
      console.log("WebSocket error: ", error);
    };

    return () => {
      socket.close();
    };
  }, [messageHandlers]);

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
        prevHandlers.filter((handler) => handler !== callback),
      );
    },
    [],
  );

  return (
    <WebSocketContext.Provider
      value={{
        sendMessage,
        connected,
        messages,
        onMessage,
        removeMessageHandler,
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
