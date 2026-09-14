function periodKey(period) {
  if (!period?.start || !period?.end) return ''
  return `${period.start}|${period.end}|${period.reportMonth || ''}`
}

export function resolveImportPeriod(entries) {
  const seenVehicles = new Map()
  const periods = new Map()

  for (const entry of entries || []) {
    if (!entry?.vehicleId) continue
    if (seenVehicles.has(entry.vehicleId)) {
      const first = seenVehicles.get(entry.vehicleId)
      throw new Error(`В книге несколько листов для одной машины: ${first} и ${entry.sheetName || entry.vehicleId}.`)
    }
    seenVehicles.set(entry.vehicleId, entry.sheetName || entry.vehicleId)

    const key = periodKey(entry.period)
    if (key && !periods.has(key)) periods.set(key, entry.period)
  }

  if (!periods.size) throw new Error('Не удалось определить расчётный период из заголовков листов.')
  if (periods.size > 1) throw new Error('В книге обнаружены разные расчётные периоды. Импортируйте каждый месяц отдельным файлом.')
  return [...periods.values()][0]
}
