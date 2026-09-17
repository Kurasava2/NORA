from pathlib import Path
import shutil

ROOT = Path('shdk-personnel-app-v0.6.0')
OVR = Path('shdk-build-overrides/sqlite')

shutil.copy2(OVR / 'package.json', ROOT / 'package.json')
shutil.copy2(OVR / 'SqliteStorageAdapter.ts', ROOT / 'src/storage/SqliteStorageAdapter.ts')
shutil.copy2(OVR / 'main.ts', ROOT / 'src/main/main.ts')
shutil.copy2(OVR / 'sqliteStorage.test.ts', ROOT / 'tests/sqliteStorage.test.ts')

ipc = ROOT / 'src/main/ipc.ts'
text = ipc.read_text(encoding='utf-8')
text = text.replace("import type { RocksDbStorageAdapter } from '../storage/RocksDbStorageAdapter';", "import type { SqliteStorageAdapter } from '../storage/SqliteStorageAdapter';")
text = text.replace('export function registerIpc(storage: RocksDbStorageAdapter): void {', 'export function registerIpc(storage: SqliteStorageAdapter): void {')
ipc.write_text(text, encoding='utf-8')

migrations = ROOT / 'src/storage/migrations.ts'
text = migrations.read_text(encoding='utf-8')
text = text.replace('export const CURRENT_SCHEMA_VERSION = 4;', 'export const CURRENT_SCHEMA_VERSION = 5;')
block = """

  if (version < 5) {
    await storage.batch([
      { type: 'put', namespace: 'meta', key: 'schemaVersion', value: 5 },
      { type: 'put', namespace: 'meta', key: 'appDataModel', value: 'personnel-v5-sqlite' },
      { type: 'put', namespace: 'meta', key: 'storageEngine', value: 'sqlite-sqljs' },
      { type: 'put', namespace: 'meta', key: 'schemaV5MigratedAt', value: new Date().toISOString() }
    ]);
  }
"""
if 'schemaV5MigratedAt' not in text:
    pos = text.rfind('}')
    text = text[:pos] + block + text[pos:]
migrations.write_text(text, encoding='utf-8')

app = ROOT / 'src/renderer/App.tsx'
text = app.read_text(encoding='utf-8')
text = text.replace("RocksDB · {dbPath ? 'подключена' : '...'}", "SQLite · {dbPath ? 'подключена' : '...'}")
text = text.replace('Дерево подразделений из RocksDB.', 'Дерево подразделений из SQLite.')
text = text.replace('commitText="Записать в RocksDB"', 'commitText="Записать в SQLite"')
app.write_text(text, encoding='utf-8')

for rel in ['src/storage/RocksDbStorageAdapter.ts', 'src/storage/rocksdb.d.ts', 'src/storage/keys.ts']:
    (ROOT / rel).unlink(missing_ok=True)

print('Patched SHDK v0.7.0 to SQLite/sql.js storage')
