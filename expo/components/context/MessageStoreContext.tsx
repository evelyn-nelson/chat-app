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

// Future actions for persistence
//   | { type: "MARK_MESSAGES_PERSISTED"; payload: { messageIds: string[] } }
//   | {
//       type: "SET_MESSAGE_STATUS";
//       payload: { messageId: string; status: MessageStatus };
//     };

interface MessageState {
  messages: Record<number, Message[]>; // Grouped by group_id
  loading: boolean;
  error: string | null;
}

type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

interface MessageStoreContextType {
  getMessagesForGroup: (groupId: number) => Message[];
  loading: boolean;
  error: string | null;
  loadHistoricalMessages: () => Promise<void>;
  // Future persistence methods
  //   persistMessages: (messages: Message[]) => Promise<void>;
  //   loadPersistedMessages: () => Promise<void>;
}

const initialState: MessageState = {
  messages: {},
  loading: false,
  error: null,
  //   persistedMessageIds: new Set(),
  //   messageStatus: {},
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

    // Future persistence-related reducers
    // case 'MARK_MESSAGES_PERSISTED': {
    //   const newPersistedIds = new Set([...state.persistedMessageIds]);
    //   action.payload.messageIds.forEach(id => newPersistedIds.add(id));
    //   return {
    //     ...state,
    //     persistedMessageIds: newPersistedIds
    //   };
    // }

    // case 'SET_MESSAGE_STATUS': {
    //   return {
    //     ...state,
    //     messageStatus: {
    //       ...state.messageStatus,
    //       [action.payload.messageId]: action.payload.status
    //     }
    //   };
    // }

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
  const { user } = useGlobalStore();

  const loadHistoricalMessages = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await http.get(
        `http://${process.env.EXPO_PUBLIC_HOST}/ws/relevantMessages`
      );
      dispatch({ type: "SET_HISTORICAL_MESSAGES", payload: response.data });
      dispatch({ type: "SET_ERROR", payload: null });
    } catch (error) {
      if (!(error instanceof CanceledError)) {
        console.error("Failed to load historical messages:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to load messages" });
      }
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  useEffect(() => {
    loadHistoricalMessages();
  }, []);

  useEffect(() => {
    const handleMessage = (message: Message) => {
      dispatch({ type: "ADD_MESSAGE", payload: message });
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

  // Future persistence methods
  //   const persistMessages = useCallback(async (messages: Message[]) => {
  //   }, []);

  //   const loadPersistedMessages = useCallback(async () => {
  //   }, []);

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
