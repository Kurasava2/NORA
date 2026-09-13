const fs = require('fs')
const path = require('path')

const DEFAULT_MAX_JSON_BYTES = 64 * 1024 * 1024

function safeUnlink(file) {
  try { if (fs.existsSync(file)) fs.unlinkSync(file) } catch {}
}

function fileSize(file) {
  return fs.statSync(file).size
}

function readJsonFile(file, maxBytes = DEFAULT_MAX_JSON_BYTES) {
  const size = fileSize(file)
  if (size > maxBytes) throw new Error(`Файл базы слишком большой (${Math.ceil(size / 1024 / 1024)} МБ).`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function isValidJsonFile(file, maxBytes = DEFAULT_MAX_JSON_BYTES) {
  try {
    readJsonFile(file, maxBytes)
    return true
  } catch {
    return false
  }
}

function corruptArchivePath(file) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${file}.corrupt-${stamp}`
}

function writeJsonAtomic(file, data, maxBytes = DEFAULT_MAX_JSON_BYTES) {
  const dir = path.dirname(file)
  const tmp = `${file}.tmp`
  const backup = `${file}.bak`
  const json = JSON.stringify(data)
  const bytes = Buffer.byteLength(json, 'utf8')
  if (bytes > maxBytes) throw new Error(`База слишком большая для сохранения (${Math.ceil(bytes / 1024 / 1024)} МБ).`)

  fs.mkdirSync(dir, { recursive: true })
  let fd = null, movedOriginalTo = null
  try {
    fd = fs.openSync(tmp, 'w')
    fs.writeFileSync(fd, json, 'utf8')
    fs.fsyncSync(fd)
    fs.closeSync(fd)
    fd = null

    if (fs.existsSync(file)) {
      movedOriginalTo = isValidJsonFile(file, maxBytes) ? backup : corruptArchivePath(file)
      fs.renameSync(file, movedOriginalTo)
    }

    fs.renameSync(tmp, file)
    return { success: true, backupPath: fs.existsSync(backup) ? backup : null }
  } catch (error) {
    if (fd !== null) {
      try { fs.closeSync(fd) } catch {}
    }
    if (!fs.existsSync(file) && movedOriginalTo && fs.existsSync(movedOriginalTo)) {
      try { fs.renameSync(movedOriginalTo, file) } catch {}
    }
    safeUnlink(tmp)
    throw error
  }
}

async function writeFileAtomic(file, data, encoding = null) {
  const dir = path.dirname(file)
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`)
  await fs.promises.mkdir(dir, { recursive: true })
  let handle = null
  try {
    handle = await fs.promises.open(tmp, 'w')
    await handle.writeFile(data, encoding || undefined)
    await handle.sync()
    await handle.close()
    handle = null
    await fs.promises.rename(tmp, file)
    return { success: true }
  } catch (error) {
    if (handle) {
      try { await handle.close() } catch {}
    }
    try { await fs.promises.unlink(tmp) } catch {}
    throw error
  }
}

async function copyFileAtomic(source, target) {
  const dir = path.dirname(target)
  const tmp = path.join(dir, `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`)
  await fs.promises.mkdir(dir, { recursive: true })
  try {
    await fs.promises.copyFile(source, tmp)
    await fs.promises.rename(tmp, target)
    return { success: true }
  } catch (error) {
    try { await fs.promises.unlink(tmp) } catch {}
    throw error
  }
}

function loadJsonWithRecovery(file, maxBytes = DEFAULT_MAX_JSON_BYTES) {
  const tmp = `${file}.tmp`
  const backup = `${file}.bak`
  if (!fs.existsSync(file)) {
    for (const [candidate, recoveredFrom] of [[tmp, 'temporary'], [backup, 'backup']]) {
      if (!fs.existsSync(candidate)) continue
      try {
        return { data: readJsonFile(candidate, maxBytes), recoveredFrom, sourcePath: candidate }
      } catch {}
    }
    return { data: null, recoveredFrom: null, sourcePath: null }
  }

  try {
    const data = readJsonFile(file, maxBytes)
    if (fs.existsSync(tmp)) {
      try {
        const tmpData = readJsonFile(tmp, maxBytes)
        const mainMtime = fs.statSync(file).mtimeMs
        const tmpMtime = fs.statSync(tmp).mtimeMs
        if (tmpMtime >= mainMtime) {
          return { data: tmpData, recoveredFrom: 'temporary', sourcePath: tmp, mainError: 'Обнаружено незавершённое более новое сохранение.' }
        }
      } catch {}
      safeUnlink(tmp)
    }
    return { data, recoveredFrom: null, sourcePath: file }
  } catch (mainError) {
    for (const [candidate, recoveredFrom] of [[tmp, 'temporary'], [backup, 'backup']]) {
      if (!fs.existsSync(candidate)) continue
      try {
        return {
          data: readJsonFile(candidate, maxBytes),
          recoveredFrom,
          sourcePath: candidate,
          mainError: mainError.message
        }
      } catch {}
    }
    const error = new Error(`Не удалось прочитать основную базу и восстановительные копии: ${mainError.message}`)
    error.cause = mainError
    throw error
  }
}

module.exports = {
  DEFAULT_MAX_JSON_BYTES,
  readJsonFile,
  writeJsonAtomic,
  loadJsonWithRecovery,
  writeFileAtomic,
  copyFileAtomic
}
