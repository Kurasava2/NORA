const crypto = require('crypto')

const BACKUP_FORMAT = 'gsm-vedomosti-backup'
const BACKUP_FORMAT_VERSION = 1
const CHECKSUM_ALGORITHM = 'sha256'

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(canonicalize)

  const canonicalObject = {}
  for (const key of Object.keys(value).sort()) {
    const propertyValue = value[key]
    if (propertyValue !== undefined) canonicalObject[key] = canonicalize(propertyValue)
  }
  return canonicalObject
}

function checksumFor(dataSchemaVersion, applicationData) {
  const checksumPayload = JSON.stringify(
    canonicalize({ dataSchemaVersion, data: applicationData }),
  )
  const checksumHash = crypto
    .createHash(CHECKSUM_ALGORITHM)
    .update(checksumPayload, 'utf8')
    .digest('hex')
  return `${CHECKSUM_ALGORITHM}:${checksumHash}`
}

function createUniversalBackup(applicationData, options = {}) {
  if (!applicationData || typeof applicationData !== 'object' || Array.isArray(applicationData)) {
    throw new Error('Некорректные данные для резервной копии.')
  }

  const dataSchemaVersion =
    Number.isInteger(applicationData.version) && applicationData.version >= 0
      ? applicationData.version
      : 0
  const createdAt = options.createdAt || new Date().toISOString()
  const appVersion = String(options.appVersion || '').trim() || 'unknown'
  const backupEnvelope = {
    format: BACKUP_FORMAT,
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    createdAt,
    appVersion,
    dataSchemaVersion,
    checksum: checksumFor(dataSchemaVersion, applicationData),
    data: applicationData,
  }
  return JSON.stringify(backupEnvelope, null, 2)
}

function parseUniversalBackup(text) {
  let backupEnvelope
  try {
    backupEnvelope = JSON.parse(text)
  } catch {
    throw new Error('Файл универсальной резервной копии повреждён или имеет неверный формат.')
  }

  if (!backupEnvelope || backupEnvelope.format !== BACKUP_FORMAT) {
    throw new Error('Это не универсальная резервная копия ГСМ Ведомости.')
  }

  const backupFormatVersion = Number(backupEnvelope.backupFormatVersion)
  if (!Number.isInteger(backupFormatVersion) || backupFormatVersion < 1) {
    throw new Error('В резервной копии отсутствует версия формата.')
  }
  if (backupFormatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Резервная копия использует более новый формат (${backupFormatVersion}). ` +
        'Обновите приложение перед восстановлением.',
    )
  }
  if (
    !backupEnvelope.data ||
    typeof backupEnvelope.data !== 'object' ||
    Array.isArray(backupEnvelope.data)
  ) {
    throw new Error('В резервной копии отсутствуют данные приложения.')
  }

  const dataSchemaVersion = Number.isInteger(backupEnvelope.dataSchemaVersion)
    ? backupEnvelope.dataSchemaVersion
    : Number.isInteger(backupEnvelope.data.version)
      ? backupEnvelope.data.version
      : 0

  if (backupEnvelope.checksum) {
    const expectedChecksum = checksumFor(dataSchemaVersion, backupEnvelope.data)
    if (backupEnvelope.checksum !== expectedChecksum) {
      throw new Error('Контрольная сумма резервной копии не совпадает. Файл повреждён или был изменён.')
    }
  }

  return {
    data: backupEnvelope.data,
    meta: {
      format: backupEnvelope.format,
      backupFormatVersion,
      createdAt: backupEnvelope.createdAt || '',
      appVersion: backupEnvelope.appVersion || '',
      dataSchemaVersion,
      verified: Boolean(backupEnvelope.checksum),
    },
  }
}

module.exports = {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  createUniversalBackup,
  parseUniversalBackup,
  checksumFor,
}
