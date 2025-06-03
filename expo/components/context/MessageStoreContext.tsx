import { DbMessage, RawMessage } from "@/types/types";
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
import * as encryptionService from "@/services/encryptionService";

type MessageAction =
  | { type: "ADD_MESSAGE"; payload: DbMessage }
  | { type: "SET_HISTORICAL_MESSAGES"; payload: DbMessage[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

interface MessageState {
  messages: Record<string, DbMessage[]>;
  loading: boolean;
  error: string | null;
}

interface MessageStoreContextType {
  getMessagesForGroup: (groupId: string) => DbMessage[];
  loading: boolean;
  error: string | null;
  loadHistoricalMessages: (deviceId?: string) => Promise<void>;
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
      const existingGroupMessages = state.messages[groupId] || [];
      if (existingGroupMessages.find((m) => m.id === action.payload.id)) {
        return state;
      }
      const updatedGroupMessages = [...existingGroupMessages, action.payload];
      updatedGroupMessages.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      return {
        ...state,
        messages: {
          ...state.messages,
          [groupId]: updatedGroupMessages,
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
        {} as Record<string, DbMessage[]>
      );
      for (const groupId in messagesByGroup) {
        messagesByGroup[groupId].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
      return { ...state, messages: messagesByGroup };
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
  const { store, deviceId: globalDeviceId } = useGlobalStore();

  const isSyncingHistoricalMessagesRef = useRef(false);

  const loadHistoricalMessages = useCallback(
    async (deviceId?: string) => {
      const preferredDeviceId = globalDeviceId ?? deviceId;
      if (isSyncingHistoricalMessagesRef.current) {
        console.log(
          "loadHistoricalMessages: Sync already in progress. Skipping."
        );
        return;
      }
      if (!preferredDeviceId) {
        console.error(
          "loadHistoricalMessages: Device ID not available. Skipping."
        );
        dispatch({ type: "SET_ERROR", payload: "Device ID not configured." });
        return;
      }

      isSyncingHistoricalMessagesRef.current = true;
      dispatch({ type: "SET_LOADING", payload: true });

      try {
        const response = await http.get<RawMessage[]>(
          `${process.env.EXPO_PUBLIC_HOST}/ws/relevant-messages`
        );
        const rawMessages: RawMessage[] = response.data;
        const processedMessages: DbMessage[] = [];

        for (const rawMsg of rawMessages) {
          const processed = encryptionService.processAndDecodeIncomingMessage(
            rawMsg,
            preferredDeviceId,
            rawMsg.sender_id,
            rawMsg.id,
            rawMsg.timestamp
          );
          if (processed) {
            processedMessages.push(processed);
          } else {
            console.warn(
              `Failed to process historical raw message with ID: ${rawMsg.id}`
            );
          }
        }

        await store.saveMessages(processedMessages, true);
        dispatch({
          type: "SET_HISTORICAL_MESSAGES",
          payload: processedMessages,
        });
        dispatch({ type: "SET_ERROR", payload: null });
      } catch (error) {
        if (!(error instanceof CanceledError)) {
          console.error(
            "loadHistoricalMessages: Failed to sync messages:",
            error
          );
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
    },
    [dispatch, store, globalDeviceId]
  );

  useEffect(() => {
    const handleNewRawMessage = async (rawMsg: RawMessage) => {
      if (!globalDeviceId) {
        console.error(
          "handleNewRawMessage: Device ID not available, cannot process message."
        );
        return;
      }

      const processedMessage =
        encryptionService.processAndDecodeIncomingMessage(
          rawMsg,
          globalDeviceId,
          rawMsg.sender_id,
          rawMsg.id,
          rawMsg.timestamp
        );

      if (processedMessage) {
        dispatch({ type: "ADD_MESSAGE", payload: processedMessage });
        await store.saveMessages([processedMessage]);
      } else {
        console.warn(
          `Failed to process incoming live raw message with ID: ${rawMsg.id}`
        );
      }
    };

    onMessage(handleNewRawMessage);
    return () => removeMessageHandler(handleNewRawMessage);
  }, [onMessage, removeMessageHandler, store, globalDeviceId]);

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
