import { Message } from "@/types/types";

export interface IStore {
  saveMessages(messages: Message[]): Promise<void>;
  loadMessages(): Promise<Message[]>;
  clearMessages(): Promise<void>;
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
