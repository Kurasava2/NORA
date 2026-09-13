const crypto = require('crypto')

const BACKUP_FORMAT = 'gsm-vedomosti-backup'
const BACKUP_FORMAT_VERSION = 1
const CHECKSUM_ALGORITHM = 'sha256'

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(canonicalize)
  const out = {}
  for (const key of Object.keys(value).sort()) {
    const item = value[key]
    if (item !== undefined) out[key] = canonicalize(item)
  }
  return out
}

function checksumFor(dataSchemaVersion, data) {
  const body = JSON.stringify(canonicalize({ dataSchemaVersion, data }))
  return `${CHECKSUM_ALGORITHM}:${crypto.createHash(CHECKSUM_ALGORITHM).update(body, 'utf8').digest('hex')}`
}

function createUniversalBackup(data, options = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Некорректные данные для резервной копии.')
  const dataSchemaVersion = Number.isInteger(data.version) && data.version >= 0 ? data.version : 0
  const createdAt = options.createdAt || new Date().toISOString()
  const appVersion = String(options.appVersion || '').trim() || 'unknown'
  const backup = {
    format: BACKUP_FORMAT,
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    createdAt,
    appVersion,
    dataSchemaVersion,
    checksum: checksumFor(dataSchemaVersion, data),
    data
  }
  return JSON.stringify(backup, null, 2)
}

function parseUniversalBackup(text) {
  let parsed
  try { parsed = JSON.parse(text) } catch { throw new Error('Файл универсальной резервной копии повреждён или имеет неверный формат.') }
  if (!parsed || parsed.format !== BACKUP_FORMAT) throw new Error('Это не универсальная резервная копия ГСМ Ведомости.')
  const version = Number(parsed.backupFormatVersion)
  if (!Number.isInteger(version) || version < 1) throw new Error('В резервной копии отсутствует версия формата.')
  if (version > BACKUP_FORMAT_VERSION) throw new Error(`Резервная копия использует более новый формат (${version}). Обновите приложение перед восстановлением.`)
  if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) throw new Error('В резервной копии отсутствуют данные приложения.')
  const dataSchemaVersion = Number.isInteger(parsed.dataSchemaVersion) ? parsed.dataSchemaVersion : (Number.isInteger(parsed.data.version) ? parsed.data.version : 0)
  if (parsed.checksum) {
    const expected = checksumFor(dataSchemaVersion, parsed.data)
    if (parsed.checksum !== expected) throw new Error('Контрольная сумма резервной копии не совпадает. Файл повреждён или был изменён.')
  }
  return {
    data: parsed.data,
    meta: {
      format: parsed.format,
      backupFormatVersion: version,
      createdAt: parsed.createdAt || '',
      appVersion: parsed.appVersion || '',
      dataSchemaVersion,
      verified: !!parsed.checksum
    }
  }
}

module.exports = {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  createUniversalBackup,
  parseUniversalBackup,
  checksumFor
}
