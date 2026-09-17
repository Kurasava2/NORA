import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SqliteStorageAdapter } from '../src/storage/SqliteStorageAdapter';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('SqliteStorageAdapter', () => {
  it('persists, scans by prefix and commits batches atomically', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shdk-sqlite-'));
    dirs.push(dir);
    const file = path.join(dir, 'personnel.sqlite');
    const db = new SqliteStorageAdapter(file);
    await db.open();
    await db.put('persons', 'p:1', { name: 'Иванов' });
    await db.batch([
      { type: 'put', namespace: 'persons', key: 'p:2', value: { name: 'Петров' } },
      { type: 'put', namespace: 'meta', key: 'probe', value: 42 }
    ]);
    expect((await db.scan<{ name: string }>('persons', 'p:')).map((row) => row.value.name)).toEqual(['Иванов', 'Петров']);
    await db.close();

    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file).subarray(0, 15).toString('utf8')).toBe('SQLite format 3');

    const reopened = new SqliteStorageAdapter(file);
    await reopened.open();
    expect(await reopened.get<number>('meta', 'probe')).toBe(42);
    expect(await reopened.get<{ name: string }>('persons', 'p:1')).toEqual({ name: 'Иванов' });
    await reopened.close();
  });
});
