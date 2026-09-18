function serializeJson(value) {
  return JSON.stringify(value === undefined ? null : value)
}

function parseJson(text, fallback) {
  if (typeof text !== 'string' || !text) return fallback
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

function withoutFields(source, fieldNames) {
  const output = { ...(source || {}) }
  for (const fieldName of fieldNames) delete output[fieldName]
  return output
}

function storageKey(kind, indexes, logicalId) {
  const suffix = String(logicalId || '').trim()
  const position = (indexes || []).join('.')
  return `${kind}:${position}:${suffix}`
}

module.exports = {
  serializeJson,
  parseJson,
  withoutFields,
  storageKey,
}
