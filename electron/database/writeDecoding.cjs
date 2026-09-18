const { run } = require('./driver.cjs')
const { serializeJson, storageKey } = require('./stateJson.cjs')

async function insertRows(database, tableName, rows, valueBuilder) {
  for (const [position, row] of (rows || []).entries()) {
    const values = valueBuilder(row || {}, position)
    await run(database, values.sql, values.parameters)
  }
}

async function writeDecodingState(database, decoding = {}) {
  await insertRows(
    database,
    'decoding_documents',
    decoding.documents,
    (document, position) => ({
      sql: `INSERT INTO decoding_documents(
        id, period_id, mode, status, position, data_json
      ) VALUES(?, ?, ?, ?, ?, ?)`,
      parameters: [
        storageKey('decoding', [position], document.id),
        String(document.periodId || ''),
        String(document.mode || ''),
        String(document.status || ''),
        position,
        serializeJson(document),
      ],
    }),
  )

  await insertRows(
    database,
    'density_movements',
    decoding.densityMovements,
    (movement, position) => ({
      sql: `INSERT INTO density_movements(
        id, period_id, vehicle_id, material_name, density,
        kind, movement_date, position, data_json
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      parameters: [
        storageKey('movement', [position], movement.id),
        String(movement.periodId || ''),
        String(movement.vehicleId || ''),
        String(movement.materialName || ''),
        String(movement.density || ''),
        String(movement.kind || ''),
        String(movement.date || ''),
        position,
        serializeJson(movement),
      ],
    }),
  )

  await insertRows(
    database,
    'density_allocations',
    decoding.allocations,
    (allocation, position) => ({
      sql: `INSERT INTO density_allocations(
        id, decoding_id, statement_id, vehicle_id, material_name,
        density, kind, source, position, data_json
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      parameters: [
        storageKey('allocation', [position], allocation.id),
        String(allocation.decodingId || ''),
        String(allocation.statementId || ''),
        String(allocation.vehicleId || ''),
        String(allocation.materialName || ''),
        String(allocation.density || ''),
        String(allocation.kind || ''),
        String(allocation.source || ''),
        position,
        serializeJson(allocation),
      ],
    }),
  )

  await insertRows(
    database,
    'decoding_containers',
    decoding.containers,
    (container, position) => ({
      sql: `INSERT INTO decoding_containers(
        id, decoding_id, material_name, position, data_json
      ) VALUES(?, ?, ?, ?, ?)`,
      parameters: [
        storageKey('container', [position], container.id),
        String(container.decodingId || ''),
        String(container.materialName || ''),
        position,
        serializeJson(container),
      ],
    }),
  )

  await insertRows(
    database,
    'legacy_density_lots',
    decoding.legacyDensityLots,
    (legacyLot, position) => ({
      sql: 'INSERT INTO legacy_density_lots(position, data_json) VALUES(?, ?)',
      parameters: [position, serializeJson(legacyLot)],
    }),
  )

  await insertRows(
    database,
    'legacy_allocations',
    decoding.legacyAllocations,
    (legacyAllocation, position) => ({
      sql: 'INSERT INTO legacy_allocations(position, data_json) VALUES(?, ?)',
      parameters: [position, serializeJson(legacyAllocation)],
    }),
  )
}

module.exports = { writeDecodingState }
