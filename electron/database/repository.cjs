const { isDeepStrictEqual } = require('node:util')
const { exec, get, run, withTransaction } = require('./driver.cjs')
const { readCoreState } = require('./readCore.cjs')
const { readDecodingState } = require('./readDecoding.cjs')
const { parseJson, serializeJson, withoutFields } = require('./stateJson.cjs')
const { writeCoreState } = require('./writeCore.cjs')
const { writeDecodingState } = require('./writeDecoding.cjs')

const CLEAR_TABLES = [
  'trip_materials',
  'trips',
  'statements',
  'periods',
  'vehicle_settings',
  'vehicles',
  'catalog_materials',
  'settings',
  'density_allocations',
  'density_movements',
  'decoding_containers',
  'decoding_documents',
  'legacy_density_lots',
  'legacy_allocations',
]

async function setMeta(database, key, value) {
  await run(
    database,
    `INSERT INTO app_meta(key, value) VALUES(?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, String(value)],
  )
}

async function clearStateTables(database) {
  for (const tableName of CLEAR_TABLES) {
    await exec(database, `DELETE FROM ${tableName}`)
  }
  await exec(
    database,
    "DELETE FROM app_meta WHERE key <> 'db_schema_version'",
  )
}

async function writeState(database, state) {
  await clearStateTables(database)
  await setMeta(database, 'storage_format', 'gsm-relational-v1')
  await setMeta(database, 'logical_state_version', Number(state.version || 0))
  await setMeta(
    database,
    'root_json',
    serializeJson(
      withoutFields(state, [
        'version',
        'settings',
        'periods',
        'vehicleSettings',
        'vehicles',
        'decoding',
        'catalog',
      ]),
    ),
  )
  await setMeta(
    database,
    'decoding_root_json',
    serializeJson(
      withoutFields(state.decoding || {}, [
        'documents',
        'densityMovements',
        'allocations',
        'containers',
        'legacyDensityLots',
        'legacyAllocations',
      ]),
    ),
  )
  await writeCoreState(database, state)
  await writeDecodingState(database, state.decoding)
}

async function loadState(database) {
  const versionRow = await get(
    database,
    "SELECT value FROM app_meta WHERE key = 'logical_state_version'",
  )
  if (!versionRow) return null

  const [rootRow, decodingRootRow, coreState, decodingState] = await Promise.all([
    get(database, "SELECT value FROM app_meta WHERE key = 'root_json'"),
    get(database, "SELECT value FROM app_meta WHERE key = 'decoding_root_json'"),
    readCoreState(database),
    readDecodingState(database),
  ])

  return {
    ...parseJson(rootRow?.value, {}),
    version: Number(versionRow.value || 0),
    settings: coreState.settings,
    periods: coreState.periods,
    vehicleSettings: coreState.vehicleSettings,
    vehicles: coreState.vehicles,
    decoding: {
      ...parseJson(decodingRootRow?.value, {}),
      ...decodingState,
    },
    catalog: coreState.catalog,
  }
}

async function saveState(database, state, options = {}) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('Некорректное состояние приложения для записи в SQLite.')
  }

  return withTransaction(database, async () => {
    await writeState(database, state)
    if (options.verify) {
      const savedState = await loadState(database)
      if (!isDeepStrictEqual(savedState, state)) {
        throw new Error('Проверка SQLite после записи не совпала с исходными данными.')
      }
    }
  })
}

module.exports = {
  saveState,
  loadState,
}
