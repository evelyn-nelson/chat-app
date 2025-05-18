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

  async saveMessages(
    messagesToSave: Message[],
    clearFirst: boolean = false
  ): Promise<void> {
    if (clearFirst) {
      this.messages = [...messagesToSave];
      return;
    }

    const messageMap = new Map<number, Message>(
      this.messages.map((m) => [m.id, m])
    );
    for (const message of messagesToSave) {
      messageMap.set(message.id, message);
    }
    this.messages = Array.from(messageMap.values());
  }

  async loadMessages(): Promise<Message[]> {
    return this.messages.map((message) => ({ ...message }));
  }

  async clearMessages(): Promise<void> {
    this.messages = [];
  }

  async saveGroups(
    groupsToSave: Group[],
    clearFirstAndPrune: boolean = true
  ): Promise<void> {
    const processedGroups = groupsToSave.map((group) => {
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

    if (clearFirstAndPrune) {
      this.groups = processedGroups;
    } else {
      const groupMap = new Map<number, Group>(
        this.groups.map((g) => [g.id, g])
      );
      for (const group of processedGroups) {
        groupMap.set(group.id, group);
      }
      this.groups = Array.from(groupMap.values());
    }
  }

  async loadGroups(): Promise<Group[]> {
    return this.groups.map((group) => ({
      ...group,
      group_users: group.group_users.map((gu) => ({ ...gu })),
    }));
  }

  async clearGroups(): Promise<void> {
    this.groups = [];
  }

  async saveUsers(usersToSave: User[]): Promise<void> {
    const processedUsers = usersToSave.map((user) => {
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
                }
              }
            }
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
        const plainObjectSource = sourceMapData as Record<string, unknown>;
        for (const key in plainObjectSource) {
          if (Object.prototype.hasOwnProperty.call(plainObjectSource, key)) {
            const numKey = Number(key);
            const value = plainObjectSource[key];
            if (!isNaN(numKey) && typeof value === "boolean") {
              finalGroupAdminMap.set(numKey, value);
            }
          }
        }
      } else if (
        sourceMapData === null ||
        typeof sourceMapData === "undefined"
      ) {
        finalGroupAdminMap = undefined;
      }

      return { ...user, group_admin_map: finalGroupAdminMap };
    });
    this.users = processedUsers;
  }

  async loadUsers(): Promise<User[]> {
    return this.users.map((user) => ({
      ...user,
      group_admin_map: user.group_admin_map
        ? new Map(user.group_admin_map)
        : undefined,
    }));
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
