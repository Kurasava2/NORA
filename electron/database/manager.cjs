const fs = require('fs')
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

function databaseFiles(filePath) {
  return [
    filePath,
    `${filePath}-journal`,
    `${filePath}-wal`,
    `${filePath}-shm`,
  ]
}

function archiveExistingDatabase(filePath) {
  const suffix = new Date().toISOString().replace(/[:.]/g, '-')
  const movedFiles = []

  for (const sourcePath of databaseFiles(filePath)) {
    if (!fs.existsSync(sourcePath)) continue
    const archivePath = `${sourcePath}.before-replace-${suffix}`
    fs.renameSync(sourcePath, archivePath)
    movedFiles.push({ sourcePath, archivePath })
  }
  return movedFiles
}

function restoreArchivedDatabase(filePath, movedFiles) {
  for (const currentPath of databaseFiles(filePath)) {
    try {
      if (fs.existsSync(currentPath)) fs.unlinkSync(currentPath)
    } catch {}
  }

  for (const movedFile of [...movedFiles].reverse()) {
    if (fs.existsSync(movedFile.archivePath)) {
      fs.renameSync(movedFile.archivePath, movedFile.sourcePath)
    }
  }
}

async function replaceApplicationState(state) {
  try {
    await closeApplicationStore()
  } catch {}

  const filePath = databasePath()
  const movedFiles = archiveExistingDatabase(filePath)

  try {
    const store = getApplicationStore()
    await store.save(state, { verify: true })
    return {
      success: true,
      archivedPath:
        movedFiles.find(movedFile => movedFile.sourcePath === filePath)
          ?.archivePath || null,
    }
  } catch (error) {
    try {
      await closeApplicationStore()
    } catch {}
    restoreArchivedDatabase(filePath, movedFiles)
    throw error
  }
}

module.exports = {
  getApplicationStore,
  closeApplicationStore,
  replaceApplicationState,
}
