import { useState, useCallback } from "react";
import { useWebSocket } from "../components/context/WebSocketContext";
import { useGlobalStore } from "../components/context/GlobalStoreContext";
import * as encryptionService from "@/services/encryptionService";
// import { getGroupMemberIds } from '@/services/groupService'; // Example

interface RecipientDevicePublicKey {
  deviceId: string;
  publicKey: Uint8Array;
}

interface UseSendMessageReturn {
  sendMessage: (
    plaintext: string,
    groupId: string,
    recipientUserIds: string[]
  ) => Promise<void>;
  isSending: boolean;
  sendError: string | null;
}

export const useSendMessage = (): UseSendMessageReturn => {
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { sendMessage: sendPacketOverSocket } = useWebSocket();
  const { user: currentUser, getDeviceKeysForUser } = useGlobalStore();

  const sendMessage = useCallback(
    async (
      plaintext: string,
      group_id: string,
      recipientUserIds: string[]
    ): Promise<void> => {
      setIsSending(true);
      setSendError(null);

      if (!currentUser) {
        const errorMsg = "User not authenticated. Cannot send message.";
        console.error(errorMsg);
        setSendError(errorMsg);
        setIsSending(false);
        return;
      }

      try {
        const recipientDevicePublicKeys: RecipientDevicePublicKey[] = [];
        for (const userId of recipientUserIds) {
          const keys = getDeviceKeysForUser(userId);
          if (keys && keys.length > 0) {
            recipientDevicePublicKeys.push(...keys);
          } else {
            console.warn(
              `No device keys found for recipient user ${userId}. They may not receive the message.`
            );
          }
        }

        if (recipientDevicePublicKeys.length === 0) {
          const errorMsg =
            "No valid recipient device keys found. Message cannot be encrypted for anyone.";
          console.error(errorMsg);
          setSendError(errorMsg);
          return;
        }

        const rawMessagePayload =
          await encryptionService.encryptAndPrepareMessageForSending(
            plaintext,
            group_id,
            recipientDevicePublicKeys
          );

        if (!rawMessagePayload) {
          throw new Error("Failed to encrypt the message payload.");
        }

        sendPacketOverSocket(rawMessagePayload);
      } catch (error: any) {
        console.error("Error in sendMessage process:", error);
        setSendError(
          error.message || "An unexpected error occurred while sending."
        );
      } finally {
        setIsSending(false);
      }
    },
    [currentUser, getDeviceKeysForUser, sendPacketOverSocket]
  );

  return {
    sendMessage,
    isSending,
    sendError,
  };
};
