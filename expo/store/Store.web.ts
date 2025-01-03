import type { IStore } from "./types";
import type { Group, Message } from "@/types/types";

export class Store implements IStore {
  private messages: Message[] = [];
  private groups: Group[] = [];

  async saveMessages(messages: Message[]): Promise<void> {
    const uniqueMessages = [...this.messages, ...messages].filter(
      (item, pos, self) => self.findIndex((m) => m.id === item.id) === pos
    );
    this.messages = uniqueMessages;
  }

  async loadMessages(): Promise<Message[]> {
    return this.messages;
  }

  async clearMessages(): Promise<void> {
    this.messages = [];
  }

  async saveGroups(groups: Group[]): Promise<void> {
    this.groups = groups;
  }

  async loadGroups(): Promise<Group[]> {
    return this.groups;
  }

  async clearGroups(): Promise<void> {
    this.groups = [];
  }

  async close(): Promise<void> {
    this.messages = [];
    this.groups = [];
  }
}
