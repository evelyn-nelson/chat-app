export type MessageUser = {
  id: string;
  username: string;
};

export type User = {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
  group_admin_map?: GroupAdminMap;
};

export type GroupAdminMap = Map<string, boolean>;

export type GroupUser = User & { admin: boolean; invited_at?: string };

export type Group = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  admin: boolean; // Is the current user an admin of this group?
  start_time: string | null;
  end_time: string | null;
  group_users: GroupUser[];
  description?: string | null;
  location?: string | null;
  image_url?: string | null;
};

export interface CreateGroupParams {
  name: string;
  start_time: string;
  end_time: string;
  description?: string | null;
  location?: string | null;
  image_url?: string | null;
}

export type UpdateGroupParams = {
  name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
  location?: string | null;
  image_url?: string | null;
};

export type UserGroup = {
  id: string;
  user_id: string;
  group_id: string;
  admin: boolean;
  created_at: string;
  updated_at: string;
};

// --- Message Related Types (Modified for E2EE) ---

/**
 * Represents an encrypted message as stored on the client device and ready for decryption.
 * This is the format for SQLite storage.
 */
export type Message = {
  id: string;
  sender_id: string;
  group_id: string;
  timestamp: string;

  // E2EE Fields - for this device to decrypt the message
  ciphertext: Uint8Array; // Encrypted message content (output of libsodium secretbox)
  msg_nonce: Uint8Array; // Nonce used for secretbox(ciphertext)
  sender_ephemeral_public_key: Uint8Array; // Sender's ephemeral public key used to box the sym_key
  sym_key_encryption_nonce: Uint8Array; // Nonce used when the sender boxed the sym_key
  sealed_symmetric_key: Uint8Array; // The per-message symmetric key, sealed by the sender for this device
};

/**
 * Represents the E2EE message packet sent over WebSocket to the server.
 * All binary data is Base64 encoded for JSON serialization.
 */
export type RawMessage = {
  id: string;
  groupId: string;
  msgNonce: string; // Nonce used for encrypting the message content (Base64 encoded)
  ciphertext: string; // The encrypted message content (Base64 encoded)
  timestamp: string;
  sender_id: string;
  envelopes: Array<{
    deviceId: string; // Recipient's device identifier
    ephPubKey: string; // Sender's ephemeral public key for this box (Base64 encoded)
    keyNonce: string; // Nonce for this box (Base64 encoded)
    sealedKey: string; // The symKey sealed for this recipient (Base64 encoded)
  }>;
};

export type DisplayMessage = {
  id: string;
  content: string; // Decrypted plaintext content
  user: MessageUser;
  group_id: string;
  timestamp: string;
};

export type DateOptions = {
  startTime: Date | null;
  endTime: Date | null;
};

export type PickerImageResult = {
  url: string;
  base64: string;
};
