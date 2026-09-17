import fs from 'node:fs';
import path from 'node:path';
import type { Database, SqlJsStatic } from 'sql.js';
import type { BatchOperation, StorageAdapter, StorageEntry, StorageNamespace } from '../../shdk-personnel-app-v0.6.0/src/storage/StorageAdapter';

const TABLES: Record<StorageNamespace, string> = {
  meta: 'meta', persons: 'persons', units: 'units', positions: 'positions', assignments: 'assignments',
  events: 'events', duties: 'duties', references: 'reference_data', indexes: 'app_indexes', audit: 'audit',
  imports: 'imports', contracts: 'contracts', ranks: 'rank_history'
};

type InitSqlJs = () => Promise<SqlJsStatic>;

export class SqliteStorageAdapter implements StorageAdapter {
  private db: Database | undefined;
  private opened = false;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly pathName: string) {}

  async open(): Promise<void> {
    if (this.opened) return;
    fs.mkdirSync(path.dirname(this.pathName), { recursive: true });
    const initSqlJs = require('sql.js/dist/sql-asm.js') as InitSqlJs;
    const SQL = await initSqlJs();
    const existing = fs.existsSync(this.pathName) ? fs.readFileSync(this.pathName) : undefined;
    this.db = existing && existing.byteLength > 0 ? new SQL.Database(new Uint8Array(existing)) : new SQL.Database();
    this.createTables();
    this.opened = true;
    if (!existing) this.persistNow();
  }

  async close(): Promise<void> {
    if (!this.opened || !this.db) return;
    await this.writeQueue;
    this.persistNow();
    this.db.close();
    this.db = undefined;
    this.opened = false;
  }

  async get<T>(namespace: StorageNamespace, key: string): Promise<T | undefined> {
    const stmt = this.requireDb().prepare(`SELECT value FROM ${TABLES[namespace]} WHERE key = ? LIMIT 1`);
    try {
      stmt.bind([key]);
      if (!stmt.step()) return undefined;
      const row = stmt.getAsObject() as { value?: unknown };
      return typeof row.value === 'string' ? JSON.parse(row.value) as T : undefined;
    } finally { stmt.free(); }
  }

  async put<T>(namespace: StorageNamespace, key: string, value: T): Promise<void> {
    await this.enqueueWrite(() => {
      const json = JSON.stringify(value);
      if (json === undefined) throw new Error(`Нельзя сохранить undefined: ${namespace}/${key}`);
      this.requireDb().run(
        `INSERT INTO ${TABLES[namespace]} (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ` +
        `ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`, [key, json]
      );
    });
  }

  async del(namespace: StorageNamespace, key: string): Promise<void> {
    await this.enqueueWrite(() => this.requireDb().run(`DELETE FROM ${TABLES[namespace]} WHERE key = ?`, [key]));
  }

  async scan<T>(namespace: StorageNamespace, prefix = ''): Promise<Array<StorageEntry<T>>> {
    const rows: Array<StorageEntry<T>> = [];
    const stmt = this.requireDb().prepare(`SELECT key,value FROM ${TABLES[namespace]} WHERE key >= ? AND key < ? ORDER BY key`);
    try {
      stmt.bind([prefix, `${prefix}\uffff`]);
      while (stmt.step()) {
        const row = stmt.getAsObject() as { key?: unknown; value?: unknown };
        if (typeof row.key === 'string' && typeof row.value === 'string') rows.push({ key: row.key, value: JSON.parse(row.value) as T });
      }
    } finally { stmt.free(); }
    return rows;
  }

  async batch(operations: BatchOperation[]): Promise<void> {
    if (!operations.length) return;
    await this.enqueueWrite(() => {
      const db = this.requireDb();
      db.exec('BEGIN IMMEDIATE TRANSACTION;');
      try {
        for (const op of operations) {
          const table = TABLES[op.namespace];
          if (op.type === 'del') { db.run(`DELETE FROM ${table} WHERE key = ?`, [op.key]); continue; }
          const json = JSON.stringify(op.value);
          if (json === undefined) throw new Error(`Нельзя сохранить undefined: ${op.namespace}/${op.key}`);
          db.run(`INSERT INTO ${table} (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`, [op.key, json]);
        }
        db.exec('COMMIT;');
      } catch (error) {
        try { db.exec('ROLLBACK;'); } catch {}
        throw error;
      }
    });
  }

  get databasePath(): string { return this.pathName; }

  private createTables(): void {
    const db = this.requireDb();
    db.exec('PRAGMA foreign_keys = ON;');
    for (const table of Object.values(TABLES)) {
      db.exec(`CREATE TABLE IF NOT EXISTS ${table} (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
    }
  }

  private requireDb(): Database {
    if (!this.db) throw new Error('SQLite database is not open');
    return this.db;
  }

  private async enqueueWrite(operation: () => void): Promise<void> {
    const run = this.writeQueue.then(() => { operation(); this.persistNow(); });
    this.writeQueue = run.catch(() => {});
    await run;
  }

  private persistNow(): void {
    const data = Buffer.from(this.requireDb().export());
    const tempPath = `${this.pathName}.tmp`;
    const backupPath = `${this.pathName}.bak`;
    fs.writeFileSync(tempPath, data);
    if (fs.existsSync(this.pathName)) {
      try { fs.copyFileSync(this.pathName, backupPath); } catch {}
      try { fs.renameSync(tempPath, this.pathName); }
      catch { fs.copyFileSync(tempPath, this.pathName); fs.unlinkSync(tempPath); }
    } else fs.renameSync(tempPath, this.pathName);
  }
}
