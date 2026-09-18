const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const {
  openDatabase,
  closeDatabase,
  get,
} = require('../electron/database/driver.cjs')
const {
  DB_SCHEMA_VERSION,
  initializeSchema,
} = require('../electron/database/schema.cjs')

test('SQLite schema initializes and reopens without changing its version', async () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-sqlite-'))
  const databasePath = path.join(temporaryDirectory, 'gsm-data.sqlite')

  let database = await openDatabase(databasePath)
  try {
    assert.equal(await initializeSchema(database), DB_SCHEMA_VERSION)
    const firstVersion = await get(
      database,
      'SELECT value FROM app_meta WHERE key = ?',
      ['db_schema_version'],
    )
    assert.equal(firstVersion.value, String(DB_SCHEMA_VERSION))
  } finally {
    await closeDatabase(database)
  }

  database = await openDatabase(databasePath)
  try {
    assert.equal(await initializeSchema(database), DB_SCHEMA_VERSION)
    const foreignKeys = await get(database, 'PRAGMA foreign_keys')
    assert.equal(foreignKeys.foreign_keys, 1)
  } finally {
    await closeDatabase(database)
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }
})
