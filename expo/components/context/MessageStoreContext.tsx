import { Message } from "@/types/types";
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
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
  messages: Record<string, Message[]>;
  loading: boolean;
  error: string | null;
}

interface MessageStoreContextType {
  getMessagesForGroup: (groupId: string) => Message[];
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
        {} as Record<string, Message[]>
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

  const isSyncingHistoricalMessagesRef = useRef(false);

  const loadHistoricalMessages = useCallback(async () => {
    if (isSyncingHistoricalMessagesRef.current) {
      console.log(
        "loadHistoricalMessages: Sync already in progress. Skipping."
      );
      return;
    }

    isSyncingHistoricalMessagesRef.current = true;
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const response = await http.get(
        `${process.env.EXPO_PUBLIC_HOST}/ws/relevantMessages`
      );

      await store.saveMessages(response.data, true);

      dispatch({ type: "SET_HISTORICAL_MESSAGES", payload: response.data });
      dispatch({ type: "SET_ERROR", payload: null });
    } catch (error) {
      if (!(error instanceof CanceledError)) {
        try {
          const messages = await store.loadMessages();
          dispatch({ type: "SET_HISTORICAL_MESSAGES", payload: messages });
          dispatch({
            type: "SET_ERROR",
            payload: "Failed to sync messages, showing local data.",
          });
        } catch (storeError) {
          console.error(
            "loadHistoricalMessages: Failed to load messages from store after sync error:",
            storeError
          );
          dispatch({ type: "SET_ERROR", payload: "Failed to load messages" });
        }
      } else {
        console.log("loadHistoricalMessages: Sync operation was canceled.");
      }
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      isSyncingHistoricalMessagesRef.current = false;
    }
  }, [dispatch, store, http]);

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
    (groupId: string) => {
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
