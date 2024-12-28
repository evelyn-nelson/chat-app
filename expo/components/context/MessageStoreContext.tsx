import { Message } from "@/types/types";
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useWebSocket } from "./WebSocketContext";
import http from "@/util/custom-axios";
import { useGlobalStore } from "./GlobalStoreContext";
import { CanceledError } from "axios";

type MessageAction =
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "SET_HISTORICAL_MESSAGES"; payload: Message[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

interface MessageState {
  messages: Record<number, Message[]>;
  loading: boolean;
  error: string | null;
}

interface MessageStoreContextType {
  getMessagesForGroup: (groupId: number) => Message[];
  loading: boolean;
  error: string | null;
  loadHistoricalMessages: () => Promise<void>;
}

const initialState: MessageState = {
  messages: {},
  loading: false,
  error: null,
};

const messageReducer = (
  state: MessageState,
  action: MessageAction
): MessageState => {
  switch (action.type) {
    case "ADD_MESSAGE": {
      const groupId = action.payload.group_id;

      return {
        ...state,
        messages: {
          ...state.messages,
          [groupId]: [...(state.messages[groupId] || []), action.payload],
        },
      };
    }
    case "SET_HISTORICAL_MESSAGES": {
      const messagesByGroup = action.payload.reduce(
        (acc, message) => {
          const groupId = message.group_id;
          if (!acc[groupId]) acc[groupId] = [];
          acc[groupId].push(message);
          return acc;
        },
        {} as Record<number, Message[]>
      );

      return {
        ...state,
        messages: messagesByGroup,
      };
    }

    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    default:
      return state;
  }
};

const MessageStoreContext = createContext<MessageStoreContextType | undefined>(
  undefined
);

export const MessageStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(messageReducer, initialState);
  const { onMessage, removeMessageHandler } = useWebSocket();
  const { store } = useGlobalStore();

  const loadHistoricalMessages = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await http.get(
        `http://${process.env.EXPO_PUBLIC_HOST}/ws/relevantMessages`
      );
      console.log(response.data)
      await store.clearMessages();
      await store.saveMessages(response.data);
      dispatch({ type: "SET_HISTORICAL_MESSAGES", payload: response.data });
      dispatch({ type: "SET_ERROR", payload: null });
    } catch (error) {
      if (!(error instanceof CanceledError)) {
        try {
          const messages = await store.loadMessages();
          dispatch({ type: "SET_HISTORICAL_MESSAGES", payload: messages });
        } catch (storeError) {
          console.error("Failed to load historical messages:", storeError);
          dispatch({ type: "SET_ERROR", payload: "Failed to load messages" });
        }
      }
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  useEffect(() => {
    loadHistoricalMessages();
  }, []);

  useEffect(() => {
    const handleMessage = async (message: Message) => {
      dispatch({ type: "ADD_MESSAGE", payload: message });
      const currentMessages = state.messages[message.group_id] || [];
      await store.saveMessages([...currentMessages, message]);
    };

    onMessage(handleMessage);
    return () => removeMessageHandler(handleMessage);
  }, [onMessage, removeMessageHandler]);

  const getMessagesForGroup = useCallback(
    (groupId: number) => {
      return state.messages[groupId] || [];
    },
    [state.messages]
  );

  const value = useMemo(
    () => ({
      getMessagesForGroup,
      loading: state.loading,
      error: state.error,
      loadHistoricalMessages,
    }),
    [getMessagesForGroup, state.loading, state.error, loadHistoricalMessages]
  );

  return (
    <MessageStoreContext.Provider value={value}>
      {children}
    </MessageStoreContext.Provider>
  );
};

export const useMessageStore = () => {
  const context = useContext(MessageStoreContext);
  if (!context) {
    throw new Error(
      "useMessageStore must be used within a MessageStoreProvider"
    );
  }
  return context;
};
