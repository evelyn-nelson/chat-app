import * as SQLite from "expo-sqlite";

import type { GroupRow, IStore, MessageRow, UserRow } from "./types";
import { Group, Message, User } from "@/types/types";

export class Store implements IStore {
  private db: SQLite.SQLiteDatabase | null;
  constructor() {
    this.db = SQLite.openDatabaseSync("messages.db");
    this.initDatabase();
  }

  private async initDatabase() {
    return new Promise<void>(async (resolve) => {
      if (!this.db) throw new Error("Database not initialized");
      const DATABASE_VERSION = 1;
      let { user_version: currentDbVersion } = (await this.db.getFirstAsync<{
        user_version: number;
      }>("PRAGMA user_version")) || { user_version: -1 };
      if (currentDbVersion >= DATABASE_VERSION) {
        return;
      }
      if (currentDbVersion === 0) {
        await this.db.execAsync(`
                PRAGMA journal_mode = 'wal';
                PRAGMA foreign_keys = ON;
                CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY NOT NULL, username TEXT, email TEXT, created_at TEXT, updated_at TEXT, group_admin_map TEXT);
                CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY NOT NULL, name TEXT, admin BOOLEAN DEFAULT FALSE, created_at TEXT, updated_at TEXT);
                CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY NOT NULL, content TEXT NOT NULL, user_id INTEGER NOT NULL, group_id INTEGER NOT NULL, timestamp TEXT NOT NULL, FOREIGN KEY(group_id) REFERENCES groups(id), FOREIGN KEY(user_id) REFERENCES users(id));
                `);

        currentDbVersion = 1;
        await this.db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
      }

      if (currentDbVersion === 1) {
        // add new migrations here
      }
      resolve();
    });
  }

  async saveMessages(messages: Message[]): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const users = [...new Set(messages.map((msg) => msg.user))];

      const group_ids = [...new Set(messages.map((msg) => msg.group_id))];

      const real_groups = await this.db.getAllAsync(
        `SELECT DISTINCT(id) FROM groups;`
      );

      const diff = group_ids.filter((id) => !real_groups.includes(id));

      await this.db.runAsync(
        `INSERT INTO users (id, username) 
         VALUES ${users.map(() => "(?, ?)").join(", ")}
         ON CONFLICT(id) DO UPDATE SET username = excluded.username;s
         `,
        users.flatMap((user) => [user.id, user.username])
      );

      await this.db.runAsync(
        `INSERT INTO groups (id) 
         VALUES ${diff.map(() => "(?)").join(", ")}
         ON CONFLICT(id) DO UPDATE SET name = excluded.name;
         `,
        diff.flatMap((id) => [id])
      );

      await this.db.runAsync(
        `INSERT OR REPLACE INTO messages (id, content, user_id, group_id, timestamp) 
         VALUES ${messages.map(() => "(?, ?, ?, ?, ?)").join(", ")}`,
        messages.flatMap((message) => [
          message.id,
          message.content,
          message.user.id,
          message.group_id,
          message.timestamp,
        ])
      );
    } catch (error) {
      console.error(error);
    }
  }

  async loadMessages(): Promise<Message[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getAllAsync<MessageRow>(`
        SELECT m.id as message_id, m.content AS content, m.group_id AS group_id, u.id AS user_id, u.username AS username, m.timestamp AS timestamp FROM messages AS m 
        INNER JOIN users AS u ON u.id = m.user_id`);

    return (
      result?.map((row) => {
        return {
          id: row.message_id,
          content: row.content,
          group_id: row.group_id,
          user: {
            id: row.user_id,
            username: row.username,
          },
          timestamp: row.timestamp,
        };
      }) ?? []
    );
  }

  async clearMessages(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync("DELETE FROM messages;");
  }

  async saveGroups(groups: Group[]): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `INSERT OR REPLACE INTO groups (id, name, admin, created_at, updated_at) 
         VALUES ${groups.map(() => "(?, ?, ?, ?, ?)").join(", ")}`,
      groups.flatMap((group) => [
        group.id,
        group.name,
        group.admin,
        group.created_at,
        group.updated_at,
      ])
    );
  }

  async loadGroups(): Promise<Group[]> {
    if (!this.db) throw new Error("Database not initialized");
    const result = await this.db.getAllAsync<GroupRow>(`
        SELECT * FROM groups;`);
    return (
      result?.map((row) => {
        return {
          id: row.id,
          name: row.name,
          admin: row.admin,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      }) ?? []
    );
  }

  async clearGroups(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    await this.db.runAsync("DELETE FROM groups;");
  }

  async saveUsers(users: User[]): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `INSERT OR REPLACE INTO users (id, username, email, created_at, updated_at, group_admin_map) 
         VALUES ${users.map(() => "(?, ?, ?, ?, ?, ?)").join(", ")}`,
      users.flatMap((user) => [
        user.id,
        user.username,
        user.email,
        user.created_at,
        user.updated_at,
        JSON.stringify(user.group_admin_map),
      ])
    );
  }

  async loadUsers(): Promise<User[]> {
    if (!this.db) throw new Error("Database not initialized");
    const result = await this.db.getAllAsync<UserRow>(`
        SELECT * FROM users;`);

    return (
      result?.map((row) => {
        var group_admin_map;
        try {
          group_admin_map = JSON.parse(row.group_admin_map ?? "[]");
        } catch (error) {
          console.log("row", row.group_admin_map);
          console.error(error);
          group_admin_map = [];
        }
        return {
          id: row.id,
          username: row.username,
          email: row.email,
          created_at: row.created_at,
          updated_at: row.updated_at,
          group_admin_map: group_admin_map,
        };
      }) ?? []
    );
  }

  async clearUsers(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    await this.db.runAsync("DELETE FROM users;");
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}
