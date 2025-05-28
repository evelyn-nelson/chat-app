import { RawMessage, Message } from "../types/types";
import sodium from "react-native-libsodium";
import { Base64 } from "js-base64";

export const uint8ArrayToBase64 = (arr: Uint8Array): string => {
  return Base64.fromUint8Array(arr);
};

export const base64ToUint8Array = (str: string): Uint8Array => {
  return Base64.toUint8Array(str);
};

// --- Key Management ---

/**
 * Generates a new Curve25519 key pair for long-term identity.
 * These are used for the 'box' authenticated encryption.
 */
export const generateLongTermKeyPair = async (): Promise<{
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}> => {
  await sodium.ready;
  const { publicKey, privateKey } = sodium.crypto_box_keypair();
  return { publicKey, privateKey };
};

// --- Message Processing (Incoming Messages) ---

/**
 * Processes an incoming RawMessage (from WebSocket), finds the correct envelope for the
 * current device, decodes Base64 fields, and prepares a Message object for storage/decryption.
 *
 * @param rawMessage The incoming message packet with Base64 encoded fields.
 * @param currentDeviceId The ID of the current user's device.
 * @param senderId The ID of the user who sent the message.
 * @param messageId The unique ID for this message (e.g., server-assigned or client-generated).
 * @param timestamp The timestamp for the message.
 * @returns A Message object (with Uint8Array fields) ready for storage, or null if no envelope found.
 */
export const processAndDecodeIncomingMessage = (
  rawMessage: RawMessage,
  currentDeviceId: string,
  senderId: string,
  messageId: string,
  timestamp: string
): Message | null => {
  const envelope = rawMessage.envelopes.find(
    (env) => env.deviceId === currentDeviceId
  );

  if (!envelope) {
    console.warn(
      `No envelope found for device ${currentDeviceId} in message ${messageId}`
    );
    return null;
  }

  try {
    const clientMessage: Message = {
      id: messageId,
      group_id: rawMessage.groupId,
      sender_id: senderId,
      timestamp: timestamp,

      ciphertext: base64ToUint8Array(rawMessage.ciphertext),
      msg_nonce: base64ToUint8Array(rawMessage.msgNonce),

      sender_ephemeral_public_key: base64ToUint8Array(envelope.ephPubKey),
      sym_key_encryption_nonce: base64ToUint8Array(envelope.keyNonce),
      sealed_symmetric_key: base64ToUint8Array(envelope.sealedKey),
    };
    return clientMessage;
  } catch (error) {
    console.error("Error decoding Base64 fields from RawMessage:", error);
    return null;
  }
};

// --- Encryption (Outgoing Messages) ---

/**
 * Encrypts a plaintext message, creates envelopes for recipients, Base64 encodes
 * all binary data, and returns a RawMessage object ready for sending via WebSocket.
 *
 * @param plaintext The message content to encrypt.
 * @param groupId The ID of the group this message belongs to.
 * @param recipientDevicePublicKeys An array of objects, each containing a recipient's deviceId and their long-term publicKey (Uint8Array).
 * @param senderLongTermPrivateKey The sender's long-term private key (Uint8Array).
 * @param senderUserId The sender's user ID.
 * @returns A promise that resolves to the RawMessage object (with Base64 strings).
 */
export const encryptAndPrepareMessageForSending = async (
  plaintext: string,
  groupId: string,
  recipientDevicePublicKeys: { deviceId: string; publicKey: Uint8Array }[]
): Promise<RawMessage | null> => {
  try {
    await sodium.ready;

    const symKey = sodium.crypto_secretbox_keygen();
    const msgNonceUint8Array = sodium.randombytes_buf(
      sodium.crypto_secretbox_NONCEBYTES
    );

    const plaintextUint8Array = new TextEncoder().encode(plaintext);

    const ciphertextUint8Array = sodium.crypto_secretbox_easy(
      plaintextUint8Array,
      msgNonceUint8Array,
      symKey
    );

    const senderEphemeralKeyPair = sodium.crypto_box_keypair();

    const envelopes = [];
    for (const recipient of recipientDevicePublicKeys) {
      const keyNonceUint8Array = sodium.randombytes_buf(
        sodium.crypto_box_NONCEBYTES
      );

      // Encrypt (box) the symmetric key for this recipient
      // Uses: symKey (message), keyNonce, recipient_pk, sender_ephemeral_sk
      const sealedSymmetricKeyForRecipient = sodium.crypto_box_easy(
        symKey,
        keyNonceUint8Array,
        recipient.publicKey,
        senderEphemeralKeyPair.privateKey // Sender's EPHEMERAL private key
      );

      envelopes.push({
        deviceId: recipient.deviceId,
        ephPubKey: uint8ArrayToBase64(senderEphemeralKeyPair.publicKey),
        keyNonce: uint8ArrayToBase64(keyNonceUint8Array),
        sealedKey: uint8ArrayToBase64(sealedSymmetricKeyForRecipient),
      });
    }

    const messageToSend = {
      groupId: groupId,
      msgNonce: uint8ArrayToBase64(msgNonceUint8Array),
      ciphertext: uint8ArrayToBase64(ciphertextUint8Array),
      envelopes: envelopes,
    };

    return messageToSend as RawMessage;
  } catch (error) {
    console.error("Error during message encryption and preparation:", error);
    return null;
  }
};

// --- Decryption (For Displaying Messages) ---
export const decryptStoredMessage = async (
  storedMessage: Message,
  deviceLongTermPrivateKey: Uint8Array
): Promise<string | null> => {
  try {
    await sodium.ready;

    const symKey = sodium.crypto_box_open_easy(
      storedMessage.sealed_symmetric_key,
      storedMessage.sym_key_encryption_nonce,
      storedMessage.sender_ephemeral_public_key,
      deviceLongTermPrivateKey
    );

    if (!symKey) {
      console.error("Failed to decrypt symmetric key.");
      return null;
    }

    const plaintextUint8Array = sodium.crypto_secretbox_open_easy(
      storedMessage.ciphertext,
      storedMessage.msg_nonce,
      symKey
    );

    if (!plaintextUint8Array) {
      console.error("Failed to decrypt message content.");
      return null;
    }

    return sodium.to_string(plaintextUint8Array);
    // return sodium.to_string(plaintextUint8Array); // Use if available and preferred
  } catch (error) {
    console.error("Error during message decryption:", error);
    return null;
  }
};
