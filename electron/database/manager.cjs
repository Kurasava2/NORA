const { dataPath, databasePath } = require('../paths.cjs')
const { createApplicationStore } = require('./applicationStore.cjs')

let applicationStore = null

function getApplicationStore() {
  if (!applicationStore) {
    applicationStore = createApplicationStore({
      databaseFilePath: databasePath(),
      legacyJsonPath: dataPath(),
    })
  }
  return applicationStore
}

async function closeApplicationStore() {
  if (!applicationStore) return
  const storeToClose = applicationStore
  applicationStore = null
  await storeToClose.close()
}

module.exports = {
  getApplicationStore,
  closeApplicationStore,
}
