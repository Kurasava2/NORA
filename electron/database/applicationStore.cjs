const { exec } = require('./driver.cjs')
const {
  openDatabase,
  closeDatabase,
} = require('./driver.cjs')
const { initializeSchema } = require('./schema.cjs')
const { loadState, saveState } = require('./repository.cjs')
const { loadJsonWithRecovery } = require('../storage/jsonStorage.cjs')

async function openConfiguredDatabase(databaseFilePath) {
  const database = await openDatabase(databaseFilePath)
  try {
    await initializeSchema(database)
    await exec(
      database,
      `PRAGMA foreign_keys = ON;
       PRAGMA journal_mode = DELETE;
       PRAGMA synchronous = FULL;
       PRAGMA busy_timeout = 5000;`,
    )
    return database
  } catch (error) {
    await closeDatabase(database)
    throw error
  }
}

function createApplicationStore({ databaseFilePath, legacyJsonPath }) {
  let databasePromise = null

  const database = () => {
    if (!databasePromise) {
      databasePromise = openConfiguredDatabase(databaseFilePath)
    }
    return databasePromise
  }

  const load = async () => {
    const activeDatabase = await database()
    const sqlState = await loadState(activeDatabase)
    if (sqlState) {
      return {
        data: sqlState,
        storage: 'sqlite',
        migrationRequired: false,
        recoveredFrom: null,
      }
    }

    const legacy = loadJsonWithRecovery(legacyJsonPath)
    if (!legacy.data) {
      return {
        data: null,
        storage: 'sqlite',
        migrationRequired: false,
        recoveredFrom: null,
      }
    }

    return {
      data: legacy.data,
      storage: 'legacy-json',
      migrationRequired: true,
      recoveredFrom: legacy.recoveredFrom,
      recoveryDetail: legacy.mainError || '',
    }
  }

  const save = async (state, options = {}) => {
    const activeDatabase = await database()
    await saveState(activeDatabase, state, options)
    return { success: true }
  }

  const close = async () => {
    if (!databasePromise) return
    const activeDatabase = await databasePromise
    databasePromise = null
    await closeDatabase(activeDatabase)
  }

  return { load, save, close }
}

module.exports = {
  createApplicationStore,
  openConfiguredDatabase,
}
