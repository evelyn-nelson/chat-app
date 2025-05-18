import type { IStore } from "./types";
import type {
  Group,
  Message,
  User,
  GroupUser,
  GroupAdminMap,
} from "@/types/types";

export class Store implements IStore {
  private messages: Message[] = [];
  private groups: Group[] = [];
  private users: User[] = [];

  async saveMessages(messages: Message[]): Promise<void> {
    const existingMessageIds = new Set(this.messages.map((m) => m.id));
    const newMessages = messages.filter((m) => !existingMessageIds.has(m.id));

    this.messages = this.messages
      .map((existingMsg) => {
        const updatedMsg = messages.find((m) => m.id === existingMsg.id);
        return updatedMsg || existingMsg;
      })
      .concat(newMessages);
  }

  async loadMessages(): Promise<Message[]> {
    return [...this.messages];
  }

  async clearMessages(): Promise<void> {
    this.messages = [];
  }

  async saveGroups(groups: Group[]): Promise<void> {
    this.groups = groups.map((group) => {
      let parsedGroupUsers: GroupUser[] = [];
      if (typeof group.group_users === "string") {
        try {
          parsedGroupUsers = JSON.parse(group.group_users);
        } catch (e) {
          console.error(
            `Error parsing group.group_users in Store.web.ts. Input: '${group.group_users}'`,
            e
          );
        }
      } else if (Array.isArray(group.group_users)) {
        parsedGroupUsers = group.group_users;
      } else if (group.group_users) {
        console.warn(
          `group.group_users in Store.web.ts was an unexpected type: ${typeof group.group_users}. Input:`,
          group.group_users
        );
      }
      return { ...group, group_users: parsedGroupUsers };
    });
  }

  async loadGroups(): Promise<Group[]> {
    return this.groups.map((group) => ({ ...group }));
  }

  async clearGroups(): Promise<void> {
    this.groups = [];
  }

  async saveUsers(users: User[]): Promise<void> {
    this.users = users.map((user) => {
      let finalGroupAdminMap: GroupAdminMap | undefined = undefined;

      const sourceMapData = user.group_admin_map;

      if (typeof sourceMapData === "string") {
        try {
          const parsedJson = JSON.parse(sourceMapData);
          if (
            typeof parsedJson === "object" &&
            parsedJson !== null &&
            !Array.isArray(parsedJson)
          ) {
            finalGroupAdminMap = new Map<number, boolean>();
            for (const key in parsedJson) {
              if (Object.prototype.hasOwnProperty.call(parsedJson, key)) {
                const numKey = Number(key);
                if (!isNaN(numKey) && typeof parsedJson[key] === "boolean") {
                  finalGroupAdminMap.set(numKey, parsedJson[key]);
                } else {
                  console.warn(
                    `Invalid key-value pair in parsed group_admin_map for user ${user.id}: key='${key}', value='${parsedJson[key]}'`
                  );
                }
              }
            }
          } else {
            console.warn(
              `user.group_admin_map string for user ${user.id} did not parse to a map-like object:`,
              sourceMapData
            );
          }
        } catch (e) {
          console.error(
            `Error parsing user.group_admin_map string for user ${user.id}: '${sourceMapData}'`,
            e
          );
        }
      } else if (sourceMapData instanceof Map) {
        finalGroupAdminMap = sourceMapData;
      } else if (
        typeof sourceMapData === "object" &&
        sourceMapData !== null &&
        !Array.isArray(sourceMapData)
      ) {
        finalGroupAdminMap = new Map<number, boolean>();
        const plainObjectSource = sourceMapData as Record<string, unknown>; // Type assertion
        for (const key in plainObjectSource) {
          if (Object.prototype.hasOwnProperty.call(plainObjectSource, key)) {
            const numKey = Number(key);
            const value = plainObjectSource[key]; // value is unknown here
            if (!isNaN(numKey) && typeof value === "boolean") {
              finalGroupAdminMap.set(numKey, value);
            } else {
              console.warn(
                `Invalid key-value pair in object group_admin_map for user ${user.id}: key='${key}', value='${value}'`
              );
            }
          }
        }
      } else if (
        sourceMapData === null ||
        typeof sourceMapData === "undefined"
      ) {
        finalGroupAdminMap = undefined;
      } else {
        console.warn(
          `user.group_admin_map for user ${user.id} was an unexpected type: ${typeof sourceMapData}`,
          sourceMapData
        );
      }

      return { ...user, group_admin_map: finalGroupAdminMap };
    });
  }

  async loadUsers(): Promise<User[]> {
    return this.users.map((user) => ({ ...user }));
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
