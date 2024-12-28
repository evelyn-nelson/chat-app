import type { IStore } from "./types";
import type { Group, Message } from "@/types/types";

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

  async saveGroups(groups: Group[]): Promise<void> {
    console.log(groups);
    localStorage.setItem("groups", JSON.stringify(groups));
  }

  async loadGroups(): Promise<Group[]> {
    const stored = localStorage.getItem("groups");
    return stored ? JSON.parse(stored) : [];
  }

  async clearGroups(): Promise<void> {
    localStorage.removeItem("groups");
  }

  async close(): Promise<void> {
    // no-op
  }
}
