import type { IStore } from "./types";
import type { Group, Message, User } from "@/types/types";

export class Store implements IStore {
  private messages: Message[] = [];
  private groups: Group[] = [];
  private users: User[] = [];

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
    this.groups = groups.map((group) => {
      return { ...group, group_users: JSON.parse(`${group.group_users}`) };
    });
  }

  async loadGroups(): Promise<Group[]> {
    return this.groups;
  }

  async clearGroups(): Promise<void> {
    this.groups = [];
  }

  async saveUsers(users: User[]): Promise<void> {
    this.users = users.map((user) => {
      return {
        ...user,
        group_admin_map: JSON.parse(`${user.group_admin_map}`) ?? {},
      };
    });
  }

  async loadUsers(): Promise<User[]> {
    return this.users;
  }

  async clearUsers(): Promise<void> {
    this.users = [];
  }

  async close(): Promise<void> {
    this.clearGroups();
    this.clearMessages();
    this.clearUsers();
  }
}
