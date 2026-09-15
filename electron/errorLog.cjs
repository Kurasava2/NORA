const fs = require('fs')
const path = require('path')
const { errorLogPath } = require('./paths.cjs')

const MAX_ERROR_LOG_BYTES = 1024 * 1024

function logError(scope, error) {
  try {
    const logFilePath = errorLogPath()
    const previousLogPath = `${logFilePath}.previous`
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true })

    if (fs.existsSync(logFilePath) && fs.statSync(logFilePath).size >= MAX_ERROR_LOG_BYTES) {
      try {
        if (fs.existsSync(previousLogPath)) fs.unlinkSync(previousLogPath)
      } catch {}
      try {
        fs.renameSync(logFilePath, previousLogPath)
      } catch {}
    }

    const errorDetails = error?.stack || error?.message || String(error)
    fs.appendFileSync(
      logFilePath,
      `[${new Date().toISOString()}] ${scope}\n${errorDetails}\n\n`,
      'utf8',
    )
  } catch {}
}

function checkFileSize(filePath, maxBytes, label) {
  const fileSize = fs.statSync(filePath).size
  if (fileSize > maxBytes) {
    throw new Error(`${label} слишком большой (${Math.ceil(fileSize / 1024 / 1024)} МБ).`)
  }
  return fileSize
}

module.exports = { checkFileSize, logError }
