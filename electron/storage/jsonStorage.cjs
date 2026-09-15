const fs = require('fs')
const path = require('path')

const DEFAULT_MAX_JSON_BYTES = 64 * 1024 * 1024

function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch {}
}

function readJsonFile(filePath, maxBytes = DEFAULT_MAX_JSON_BYTES) {
  const sizeBytes = fs.statSync(filePath).size
  if (sizeBytes > maxBytes) {
    throw new Error(`Файл базы слишком большой (${Math.ceil(sizeBytes / 1024 / 1024)} МБ).`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function isValidJsonFile(filePath, maxBytes = DEFAULT_MAX_JSON_BYTES) {
  try {
    readJsonFile(filePath, maxBytes)
    return true
  } catch {
    return false
  }
}

function corruptArchivePath(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${filePath}.corrupt-${timestamp}`
}

function writeJsonAtomic(filePath, applicationData, maxBytes = DEFAULT_MAX_JSON_BYTES) {
  const temporaryPath = `${filePath}.tmp`
  const backupPath = `${filePath}.bak`
  const serializedData = JSON.stringify(applicationData)
  const sizeBytes = Buffer.byteLength(serializedData, 'utf8')

  if (sizeBytes > maxBytes) {
    throw new Error(`База слишком большая для сохранения (${Math.ceil(sizeBytes / 1024 / 1024)} МБ).`)
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  let fileDescriptor = null
  let movedOriginalPath = null

  try {
    fileDescriptor = fs.openSync(temporaryPath, 'w')
    fs.writeFileSync(fileDescriptor, serializedData, 'utf8')
    fs.fsyncSync(fileDescriptor)
    fs.closeSync(fileDescriptor)
    fileDescriptor = null

    if (fs.existsSync(filePath)) {
      movedOriginalPath = isValidJsonFile(filePath, maxBytes)
        ? backupPath
        : corruptArchivePath(filePath)
      fs.renameSync(filePath, movedOriginalPath)
    }

    fs.renameSync(temporaryPath, filePath)
    return { success: true, backupPath: fs.existsSync(backupPath) ? backupPath : null }
  } catch (error) {
    if (fileDescriptor !== null) {
      try {
        fs.closeSync(fileDescriptor)
      } catch {}
    }
    if (!fs.existsSync(filePath) && movedOriginalPath && fs.existsSync(movedOriginalPath)) {
      try {
        fs.renameSync(movedOriginalPath, filePath)
      } catch {}
    }
    safeUnlink(temporaryPath)
    throw error
  }
}

function recoveryCandidates(filePath) {
  return [
    [`${filePath}.tmp`, 'temporary'],
    [`${filePath}.bak`, 'backup'],
  ]
}

function recoverFromCandidates(filePath, maxBytes, mainError = null) {
  for (const [candidatePath, recoveredFrom] of recoveryCandidates(filePath)) {
    if (!fs.existsSync(candidatePath)) continue
    try {
      return {
        data: readJsonFile(candidatePath, maxBytes),
        recoveredFrom,
        sourcePath: candidatePath,
        ...(mainError ? { mainError: mainError.message } : {}),
      }
    } catch {}
  }
  return null
}

function loadJsonWithRecovery(filePath, maxBytes = DEFAULT_MAX_JSON_BYTES) {
  const temporaryPath = `${filePath}.tmp`

  if (!fs.existsSync(filePath)) {
    return recoverFromCandidates(filePath, maxBytes) || {
      data: null,
      recoveredFrom: null,
      sourcePath: null,
    }
  }

  try {
    const applicationData = readJsonFile(filePath, maxBytes)
    if (fs.existsSync(temporaryPath)) {
      try {
        const temporaryData = readJsonFile(temporaryPath, maxBytes)
        if (fs.statSync(temporaryPath).mtimeMs >= fs.statSync(filePath).mtimeMs) {
          return {
            data: temporaryData,
            recoveredFrom: 'temporary',
            sourcePath: temporaryPath,
            mainError: 'Обнаружено незавершённое более новое сохранение.',
          }
        }
      } catch {}
      safeUnlink(temporaryPath)
    }
    return { data: applicationData, recoveredFrom: null, sourcePath: filePath }
  } catch (mainError) {
    const recoveredData = recoverFromCandidates(filePath, maxBytes, mainError)
    if (recoveredData) return recoveredData

    const recoveryError = new Error(
      `Не удалось прочитать основную базу и восстановительные копии: ${mainError.message}`,
    )
    recoveryError.cause = mainError
    throw recoveryError
  }
}

module.exports = {
  DEFAULT_MAX_JSON_BYTES,
  readJsonFile,
  writeJsonAtomic,
  loadJsonWithRecovery,
}
