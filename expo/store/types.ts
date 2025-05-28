import { Group, Message, User } from "@/types/types";

export interface IStore {
  /**
   * Saves an array of messages.
   * @param messages The messages to save.
   * @param clearFirst If true, existing messages will be cleared before saving the new ones.
   *                   Otherwise, messages are typically upserted or merged.
   */
  saveMessages(messages: Message[], clearFirst?: boolean): Promise<void>;

  loadMessages(): Promise<Message[]>;
  clearMessages(): Promise<void>;

  /**
   * Saves an array of groups.
   * @param groups The groups to save.
   * @param clearFirstAndPrune If true, existing groups not in the provided array may be removed,
   *                           and the provided groups will replace/update existing ones.
   *                           If false, groups are typically upserted without removing others.
   */
  saveGroups(groups: Group[], clearFirstAndPrune?: boolean): Promise<void>;

  loadGroups(): Promise<Group[]>;
  clearGroups(): Promise<void>;

  /**
   * Saves an array of users.
   * @param users The users to save.
   * @param clearFirstAndPrune (Optional consideration for future) If true, existing users not in the
   *                           provided array might be removed.
   */
  saveUsers(users: User[] /*, clearFirstAndPrune?: boolean */): Promise<void>;

  loadUsers(): Promise<User[]>;
  clearUsers(): Promise<void>;
  close(): Promise<void>;
}

export interface MessageRow {
  message_id: string;
  user_id: string;
  group_id: string;
  timestamp: string;
  username: string;
  ciphertext: Uint8Array;
  msg_nonce: Uint8Array;
  sender_ephemeral_public_key: Uint8Array;
  sym_key_encryption_nonce: Uint8Array;
  sealed_symmetric_key: Uint8Array;
}

export interface GroupRow {
  id: string;
  name: string;
  admin: boolean;
  group_users: string;
  created_at: string;
  updated_at: string;
  start_time: string;
  end_time: string;
  description: string | null;
  location: string | null;
  image_url: string | null;
}

export interface UserRow {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
  group_admin_map: string;
}
