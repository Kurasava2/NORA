const { all, get } = require('./driver.cjs')
const { parseJson } = require('./stateJson.cjs')

function groupedRows(rows, keyName) {
  const groups = new Map()
  for (const row of rows) {
    const key = row[keyName]
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  return groups
}

function tripFromRow(row, materialRowsByTrip) {
  const trip = parseJson(row.data_json, {})
  const gsm = {}
  for (const materialRow of materialRowsByTrip.get(row.id) || []) {
    gsm[materialRow.material_name] = parseJson(materialRow.data_json, {})
  }
  return { ...trip, gsm }
}

async function readCoreState(database) {
  const [
    settingsRow,
    vehicleRows,
    vehicleSettingRows,
    catalogRows,
    periodRows,
    statementRows,
    tripRows,
    materialRows,
  ] = await Promise.all([
    get(database, 'SELECT data_json FROM settings WHERE id = 1'),
    all(database, 'SELECT * FROM vehicles ORDER BY position'),
    all(database, 'SELECT * FROM vehicle_settings ORDER BY vehicle_id'),
    all(database, 'SELECT * FROM catalog_materials ORDER BY position'),
    all(database, 'SELECT * FROM periods ORDER BY position'),
    all(database, 'SELECT * FROM statements ORDER BY period_id, position'),
    all(database, 'SELECT * FROM trips ORDER BY statement_id, position'),
    all(database, 'SELECT * FROM trip_materials ORDER BY trip_id, position'),
  ])

  const materialRowsByTrip = groupedRows(materialRows, 'trip_id')
  const tripsByStatement = groupedRows(tripRows, 'statement_id')
  const statementsByPeriod = groupedRows(statementRows, 'period_id')

  const periods = periodRows.map(periodRow => {
    const period = parseJson(periodRow.data_json, {})
    const statements = (statementsByPeriod.get(periodRow.id) || []).map(statementRow => {
      const statement = parseJson(statementRow.data_json, {})
      const trips = (tripsByStatement.get(statementRow.id) || []).map(tripRow =>
        tripFromRow(tripRow, materialRowsByTrip),
      )
      return { ...statement, trips }
    })
    return { ...period, statements }
  })

  const vehicleSettings = {}
  for (const row of vehicleSettingRows) {
    vehicleSettings[row.vehicle_id] = parseJson(row.data_json, {})
  }

  return {
    settings: parseJson(settingsRow?.data_json, {}),
    vehicles: vehicleRows.map(row => parseJson(row.data_json, {})),
    vehicleSettings,
    catalog: catalogRows.map(row => parseJson(row.data_json, {})),
    periods,
  }
}

module.exports = { readCoreState }
