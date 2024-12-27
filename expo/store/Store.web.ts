import type { IStore } from "./types";
import type { Message } from "@/types/types";

export class Store implements IStore {
  async saveMessages(messages: Message[]): Promise<void> {
    const stored = localStorage.getItem("messages");

    const oldMessages = stored ? JSON.parse(stored) : [];

    const allMessages = [...oldMessages, ...messages];
    const uniqueMessages = allMessages.filter(
      (item, pos) => allMessages.indexOf(item) === pos
    );

    localStorage.setItem("messages", JSON.stringify(uniqueMessages));
  }

  async loadMessages(): Promise<Message[]> {
    const stored = localStorage.getItem("messages");
    return stored ? JSON.parse(stored) : [];
  }

  async clearMessages(): Promise<void> {
    localStorage.removeItem("messages");
  }

  async close(): Promise<void> {
    // no-op
  }
}
