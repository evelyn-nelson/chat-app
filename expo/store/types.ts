import { Group, Message } from "@/types/types";

export interface IStore {
  saveMessages(messages: Message[]): Promise<void>;
  loadMessages(): Promise<Message[]>;
  clearMessages(): Promise<void>;
  saveGroups(groups: Group[]): Promise<void>;
  loadGroups(): Promise<Group[]>;
  clearGroups(): Promise<void>;
  close(): Promise<void>;
}

export interface MessageRow {
  message_id: number;
  content: string;
  group_id: number;
  user_id: number;
  username: string;
  timestamp: string;
}

export interface GroupRow {
  id: number;
  name: string;
  admin: boolean;
  created_at: string;
  updated_at: string;
}
