const { exec, get, run } = require('./driver.cjs')

const DB_SCHEMA_VERSION = 1

const CREATE_SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  short_no TEXT NOT NULL,
  model TEXT NOT NULL,
  reg TEXT NOT NULL,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicle_settings (
  vehicle_id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  active INTEGER NOT NULL,
  position INTEGER NOT NULL,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS periods (
  id TEXT PRIMARY KEY,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  report_month TEXT NOT NULL,
  position INTEGER NOT NULL,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS statements (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  vehicle_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  statement_id TEXT NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  trip_date TEXT NOT NULL,
  waybill_number TEXT NOT NULL,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trip_materials (
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  position INTEGER NOT NULL,
  data_json TEXT NOT NULL,
  PRIMARY KEY (trip_id, material_name)
);

CREATE TABLE IF NOT EXISTS decoding_documents (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  position INTEGER NOT NULL,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS density_movements (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  material_name TEXT NOT NULL,
  density TEXT NOT NULL,
  kind TEXT NOT NULL,
  movement_date TEXT NOT NULL,
  position INTEGER NOT NULL,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS density_allocations (
  id TEXT PRIMARY KEY,
  decoding_id TEXT NOT NULL,
  statement_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  material_name TEXT NOT NULL,
  density TEXT NOT NULL,
  kind TEXT NOT NULL,
  source TEXT NOT NULL,
  position INTEGER NOT NULL,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS decoding_containers (
  id TEXT PRIMARY KEY,
  decoding_id TEXT NOT NULL,
  material_name TEXT NOT NULL,
  position INTEGER NOT NULL,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legacy_density_lots (
  position INTEGER PRIMARY KEY,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legacy_allocations (
  position INTEGER PRIMARY KEY,
  data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_statements_period ON statements(period_id, position);
CREATE INDEX IF NOT EXISTS idx_trips_statement ON trips(statement_id, position);
CREATE INDEX IF NOT EXISTS idx_movements_lookup
  ON density_movements(vehicle_id, material_name, movement_date);
CREATE INDEX IF NOT EXISTS idx_allocations_document
  ON density_allocations(decoding_id, vehicle_id, material_name);
`

async function initializeSchema(database) {
  await exec(database, CREATE_SCHEMA_SQL)
  const versionRow = await get(
    database,
    'SELECT value FROM app_meta WHERE key = ?',
    ['db_schema_version'],
  )
  if (!versionRow) {
    await run(
      database,
      'INSERT INTO app_meta(key, value) VALUES(?, ?)',
      ['db_schema_version', String(DB_SCHEMA_VERSION)],
    )
    return DB_SCHEMA_VERSION
  }

  const existingVersion = Number(versionRow.value)
  if (existingVersion > DB_SCHEMA_VERSION) {
    throw new Error(
      `База использует более новую SQL-схему (${existingVersion}). Обновите приложение.`,
    )
  }
  if (existingVersion < DB_SCHEMA_VERSION) {
    throw new Error(
      `SQL-схема ${existingVersion} требует миграции до ${DB_SCHEMA_VERSION}.`,
    )
  }
  return existingVersion
}

module.exports = {
  DB_SCHEMA_VERSION,
  CREATE_SCHEMA_SQL,
  initializeSchema,
}
