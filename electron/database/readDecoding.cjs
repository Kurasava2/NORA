const { all } = require('./driver.cjs')
const { parseJson } = require('./stateJson.cjs')

async function readJsonRows(database, tableName) {
  const rows = await all(
    database,
    `SELECT data_json FROM ${tableName} ORDER BY position`,
  )
  return rows.map(row => parseJson(row.data_json, {}))
}

async function readDecodingState(database) {
  const [
    documents,
    densityMovements,
    allocations,
    containers,
    legacyDensityLots,
    legacyAllocations,
  ] = await Promise.all([
    readJsonRows(database, 'decoding_documents'),
    readJsonRows(database, 'density_movements'),
    readJsonRows(database, 'density_allocations'),
    readJsonRows(database, 'decoding_containers'),
    readJsonRows(database, 'legacy_density_lots'),
    readJsonRows(database, 'legacy_allocations'),
  ])

  return {
    documents,
    densityMovements,
    allocations,
    containers,
    legacyDensityLots,
    legacyAllocations,
  }
}

module.exports = { readDecodingState }
