import * as SQLite from "expo-sqlite";

import type { GroupRow, IStore, MessageRow, UserRow } from "./types";
import { Group, Message, User } from "@/types/types";

export class Store implements IStore {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void>;
  // Promise-based lock to serialize transaction-based operations
  private transactionLock: Promise<void> = Promise.resolve();

  constructor() {
    this.db = SQLite.openDatabaseSync("store.db");
    this.initPromise = this._initializeDatabase();
  }

  private async _initializeDatabase(): Promise<void> {
    // ... (your existing _initializeDatabase code remains the same)
    if (!this.db) {
      throw new Error("Database not available for initialization.");
    }
    const DATABASE_VERSION = 4;
    let { user_version: currentDbVersion } = (await this.db.getFirstAsync<{
      user_version: number;
    }>("PRAGMA user_version")) || { user_version: -1 };

    if (currentDbVersion >= DATABASE_VERSION) return;

    if (currentDbVersion < 1) {
      await this.db.execAsync(`
        PRAGMA journal_mode = 'wal';
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY NOT NULL, username TEXT, email TEXT, created_at TEXT, updated_at TEXT, group_admin_map TEXT);
        CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY NOT NULL, name TEXT, admin BOOLEAN DEFAULT FALSE, group_users TEXT NOT NULL DEFAULT '[]', created_at TEXT, updated_at TEXT);
        CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY NOT NULL, content TEXT NOT NULL, user_id INTEGER NOT NULL, group_id INTEGER NOT NULL, timestamp TEXT NOT NULL, FOREIGN KEY(group_id) REFERENCES groups(id), FOREIGN KEY(user_id) REFERENCES users(id));
      `);
      await this.db.execAsync(`PRAGMA user_version = 1`);
      currentDbVersion = 1;
    }
    if (currentDbVersion === 1) {
      await this.db.execAsync(`
        ALTER TABLE groups ADD COLUMN start_time TEXT;
        ALTER TABLE groups ADD COLUMN end_time TEXT;
      `);
      await this.db.execAsync(`PRAGMA user_version = 2`);
      currentDbVersion = 2;
    }
    if (currentDbVersion === 2) {
      await this.db.execAsync("BEGIN TRANSACTION;");
      try {
        await this.db.execAsync(
          "ALTER TABLE messages RENAME TO messages_old_v2;"
        );
        await this.db.execAsync(`
          CREATE TABLE messages (
            id INTEGER PRIMARY KEY NOT NULL, content TEXT NOT NULL, user_id INTEGER NOT NULL,
            group_id INTEGER NOT NULL, timestamp TEXT NOT NULL,
            FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id)
          );
        `);
        await this.db.execAsync(`
          INSERT INTO messages (id, content, user_id, group_id, timestamp)
          SELECT id, content, user_id, group_id, timestamp FROM messages_old_v2;
        `);
        await this.db.execAsync("DROP TABLE messages_old_v2;");
        await this.db.execAsync("COMMIT;");
        await this.db.execAsync(`PRAGMA user_version = 3`);
      } catch (e) {
        await this.db.execAsync("ROLLBACK;");
        console.error("Error migrating database to version 3:", e);
        throw e;
      }
    }
    if (currentDbVersion === 3) {
      await this.db.execAsync("BEGIN TRANSACTION;");
      try {
        await this.db.execAsync(`
        ALTER TABLE groups ADD COLUMN description TEXT;
        ALTER TABLE groups ADD COLUMN location TEXT;
        ALTER TABLE groups ADD COLUMN image_url TEXT;
      `);
        await this.db.execAsync("COMMIT;");
        await this.db.execAsync(`PRAGMA user_version = 4`);
      } catch (e) {
        await this.db.execAsync("ROLLBACK;");
        console.error("Error migrating database to version 4:", e);
        throw e;
      }
    }
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    await this.initPromise;
    if (!this.db) {
      throw new Error("Database not initialized or initialization failed.");
    }
    return this.db;
  }

  /**
   * Executes a given operation within a database transaction, ensuring
   * that only one such operation runs at a time using a lock.
   */
  public async performSerialTransaction<T>(
    operation: (db: SQLite.SQLiteDatabase) => Promise<T>
  ): Promise<T> {
    const db = await this.getDb();

    let releaseLock = () => {};
    const currentLockExecution = this.transactionLock.then(async () => {
      // console.log("Lock acquired, beginning transaction for operation.");
      await db.execAsync("BEGIN TRANSACTION;");
      try {
        const result = await operation(db);
        await db.execAsync("COMMIT;");
        // console.log("Transaction committed.");
        return result;
      } catch (error) {
        console.error(
          "Error during serial transaction operation, attempting rollback:",
          error
        );
        try {
          await db.execAsync("ROLLBACK;");
          // console.log("Transaction rolled back.");
        } catch (rollbackError) {
          console.error("Failed to rollback transaction:", rollbackError);
        }
        throw error;
      }
    });

    this.transactionLock = currentLockExecution
      .catch(() => {})
      .then(() => {
        releaseLock();
      });
    const lockReleasedPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    try {
      return await currentLockExecution;
    } finally {
    }
  }

  async saveMessages(
    messagesToSave: Message[],
    clearFirst: boolean = false
  ): Promise<void> {
    return this.performSerialTransaction(async (db) => {
      if (clearFirst) {
        await db.runAsync("DELETE FROM messages;");
      }

      const users = Array.from(new Set(messagesToSave.map((msg) => msg.user)));
      const group_ids = [...new Set(messagesToSave.map((msg) => msg.group_id))];

      const real_groups = await db.getAllAsync<{ id: number }>(
        `SELECT DISTINCT(id) FROM groups;`
      );
      const real_group_ids = real_groups.map((group) => group.id);
      const diff_group_ids = group_ids.filter(
        (id) => !real_group_ids.includes(id)
      );

      for (const user of users) {
        if (user && typeof user.id !== "undefined" && user.username) {
          await db.runAsync(
            `INSERT INTO users (id, username) VALUES (?, ?)
             ON CONFLICT(id) DO UPDATE SET username = excluded.username;`,
            [user.id, user.username]
          );
        }
      }
      for (const id of diff_group_ids) {
        await db.runAsync(
          `INSERT INTO groups (id) VALUES (?) ON CONFLICT(id) DO NOTHING;`,
          [id]
        );
      }
      for (const message of messagesToSave) {
        await db.runAsync(
          `INSERT OR REPLACE INTO messages (id, content, user_id, group_id, timestamp)
           VALUES (?, ?, ?, ?, ?)`,
          [
            message.id,
            message.content,
            message.user.id,
            message.group_id,
            message.timestamp,
          ]
        );
      }
    });
  }

  async saveGroups(
    groupsToSave: Group[],
    clearFirstAndPrune: boolean = true
  ): Promise<void> {
    return this.performSerialTransaction(async (db) => {
      const incomingGroupIds = groupsToSave.map((group) => group.id);

      for (const group of groupsToSave) {
        await db.runAsync(
          `INSERT INTO groups (id, name, admin, group_users, created_at, updated_at, start_time, end_time, description, location, image_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name, admin = excluded.admin, group_users = excluded.group_users,
             created_at = excluded.created_at, updated_at = excluded.updated_at,
             start_time = excluded.start_time, end_time = excluded.end_time,
             description = excluded.description, location = excluded.location, image_url = excluded.image_url
             ;
             
             `,
          [
            group.id,
            group.name,
            group.admin ? 1 : 0,
            JSON.stringify(group.group_users || []),
            group.created_at,
            group.updated_at,
            group.start_time,
            group.end_time,
            group.description ?? null,
            group.location ?? null,
            group.image_url ?? null,
          ]
        );
      }

      if (clearFirstAndPrune) {
        if (incomingGroupIds.length > 0) {
          const placeholders = incomingGroupIds.map(() => "?").join(",");
          await db.runAsync(
            `DELETE FROM groups WHERE id NOT IN (${placeholders});`,
            incomingGroupIds
          );
        } else {
          await db.runAsync("DELETE FROM groups;"); // No incoming groups, delete all
        }
      }
    });
  }

  async saveUsers(usersToSave: User[]): Promise<void> {
    return this.performSerialTransaction(async (db) => {
      for (const user of usersToSave) {
        await db.runAsync(
          `INSERT OR REPLACE INTO users (id, username, email, created_at, updated_at, group_admin_map)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            user.id,
            user.username,
            user.email,
            user.created_at,
            user.updated_at,
            JSON.stringify(user.group_admin_map ?? {}),
          ]
        );
      }
    });
  }

  async clearMessages(): Promise<void> {
    const db = await this.getDb();
    await db.runAsync("DELETE FROM messages;");
  }
  async clearGroups(): Promise<void> {
    const db = await this.getDb();
    await db.runAsync("DELETE FROM groups;");
  }
  async clearUsers(): Promise<void> {
    const db = await this.getDb();
    await db.runAsync("DELETE FROM users;");
  }

  async loadMessages(): Promise<Message[]> {
    const db = await this.getDb();
    const result = await db.getAllAsync<MessageRow>(`
      SELECT m.id as message_id, m.content AS content, m.group_id AS group_id,
             u.id AS user_id, u.username AS username, m.timestamp AS timestamp
      FROM messages AS m
      INNER JOIN users AS u ON u.id = m.user_id
    `);
    return (
      result?.map((row) => ({
        id: row.message_id,
        content: row.content,
        group_id: row.group_id,
        user: {
          id: row.user_id,
          username: row.username,
        },
        timestamp: row.timestamp,
      })) ?? []
    );
  }
  async loadGroups(): Promise<Group[]> {
    const db = await this.getDb();
    const result = await db.getAllAsync<GroupRow>(`SELECT * FROM groups;`);
    return (
      result?.map((row) => {
        let parsedGroupUsers;
        try {
          parsedGroupUsers = JSON.parse(JSON.parse(row.group_users));
        } catch (e) {
          parsedGroupUsers = [];
        }
        return {
          id: row.id,
          name: row.name,
          admin: !!row.admin,
          group_users: parsedGroupUsers,
          created_at: row.created_at,
          updated_at: row.updated_at,
          start_time: row.start_time,
          end_time: row.end_time,
          description: row.description,
          location: row.location,
          image_url: row.image_url,
        };
      }) ?? []
    );
  }
  async loadUsers(): Promise<User[]> {
    const db = await this.getDb();
    const result = await db.getAllAsync<UserRow>(`SELECT * FROM users;`);
    return (
      result?.map((row) => {
        let group_admin_map;
        try {
          group_admin_map = JSON.parse(row.group_admin_map ?? "{}");
        } catch (error) {
          group_admin_map = {};
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

  async close(): Promise<void> {
    try {
      await this.initPromise;
      await this.transactionLock;
    } catch (error) {
      console.warn(
        "Error during pre-close waits (init or transaction lock):",
        error
      );
    }

    if (this.db) {
      try {
        await this.db.closeAsync();
        console.log("Database closed successfully.");
      } catch (closeError) {
        console.error("Error closing database:", closeError);
      } finally {
        this.db = null;
      }
    }
  }
}
