const { run } = require('./driver.cjs')
const { serializeJson, storageKey, withoutFields } = require('./stateJson.cjs')

async function writeSettings(database, state) {
  await run(
    database,
    'INSERT INTO settings(id, data_json) VALUES(1, ?)',
    [serializeJson(state.settings || {})],
  )
}

async function writeVehicles(database, state) {
  for (const [position, vehicle] of (state.vehicles || []).entries()) {
    const vehicleId = String(vehicle?.id || `__vehicle_${position}`)
    await run(
      database,
      `INSERT INTO vehicles(
        id, short_no, model, reg, position, data_json
      ) VALUES(?, ?, ?, ?, ?, ?)`,
      [
        vehicleId,
        String(vehicle?.shortNo || ''),
        String(vehicle?.model || ''),
        String(vehicle?.reg || ''),
        position,
        serializeJson(vehicle || {}),
      ],
    )
  }

  for (const [vehicleId, settings] of Object.entries(state.vehicleSettings || {})) {
    await run(
      database,
      'INSERT INTO vehicle_settings(vehicle_id, data_json) VALUES(?, ?)',
      [vehicleId, serializeJson(settings)],
    )
  }
}

async function writeCatalog(database, state) {
  for (const [position, material] of (state.catalog || []).entries()) {
    const materialId = String(material?.id || `__material_${position}`)
    await run(
      database,
      `INSERT INTO catalog_materials(
        id, name, category, active, position, data_json
      ) VALUES(?, ?, ?, ?, ?, ?)`,
      [
        materialId,
        String(material?.name || ''),
        String(material?.category || ''),
        material?.active === false ? 0 : 1,
        position,
        serializeJson(material || {}),
      ],
    )
  }
}

async function writeTrips(database, statementStorageId, trips, indexes) {
  for (const [tripIndex, trip] of (trips || []).entries()) {
    const tripStorageId = storageKey(
      'trip',
      [...indexes, tripIndex],
      trip?.id,
    )
    await run(
      database,
      `INSERT INTO trips(
        id, statement_id, position, trip_date, waybill_number, data_json
      ) VALUES(?, ?, ?, ?, ?, ?)`,
      [
        tripStorageId,
        statementStorageId,
        tripIndex,
        String(trip?.date || ''),
        String(trip?.number || ''),
        serializeJson(withoutFields(trip, ['gsm'])),
      ],
    )

    let materialPosition = 0
    for (const [materialName, materialEntry] of Object.entries(trip?.gsm || {})) {
      await run(
        database,
        `INSERT INTO trip_materials(
          trip_id, material_name, position, data_json
        ) VALUES(?, ?, ?, ?)`,
        [
          tripStorageId,
          materialName,
          materialPosition,
          serializeJson(materialEntry),
        ],
      )
      materialPosition += 1
    }
  }
}

async function writePeriods(database, state) {
  for (const [periodIndex, period] of (state.periods || []).entries()) {
    const periodStorageId = storageKey('period', [periodIndex], period?.id)
    await run(
      database,
      `INSERT INTO periods(
        id, start_date, end_date, report_month, position, data_json
      ) VALUES(?, ?, ?, ?, ?, ?)`,
      [
        periodStorageId,
        String(period?.start || ''),
        String(period?.end || ''),
        String(period?.reportMonth || ''),
        periodIndex,
        serializeJson(withoutFields(period, ['statements'])),
      ],
    )

    for (const [statementIndex, statement] of (period?.statements || []).entries()) {
      const statementStorageId = storageKey(
        'statement',
        [periodIndex, statementIndex],
        statement?.id,
      )
      await run(
        database,
        `INSERT INTO statements(
          id, period_id, vehicle_id, position, data_json
        ) VALUES(?, ?, ?, ?, ?)`,
        [
          statementStorageId,
          periodStorageId,
          String(statement?.vehicleId || ''),
          statementIndex,
          serializeJson(withoutFields(statement, ['trips'])),
        ],
      )
      await writeTrips(
        database,
        statementStorageId,
        statement?.trips,
        [periodIndex, statementIndex],
      )
    }
  }
}

async function writeCoreState(database, state) {
  await writeSettings(database, state)
  await writeVehicles(database, state)
  await writeCatalog(database, state)
  await writePeriods(database, state)
}

module.exports = { writeCoreState }
