import { num, round2 } from './numbers.js'

export function normalizeCustomVehicles(list, makeId = () => `custom_${Date.now().toString(36)}`) {
  return (Array.isArray(list) ? list : []).map(v => ({
    ...v,
    id: String(v?.id || makeId()),
    shortNo: String(v?.shortNo || '').trim(),
    model: String(v?.model || '').trim(),
    reg: String(v?.reg || '').trim(),
    baseRate: num(v?.baseRate),
    tankCapacity: num(v?.tankCapacity),
    rateUnit: v?.rateUnit === 'lMotohour' ? 'lMotohour' : 'l100km',
    hasMotohours: v?.rateUnit === 'lMotohour' ? true : !!v?.hasMotohours,
    normText: String(v?.normText || '').trim(),
    defaultMaterials: Array.isArray(v?.defaultMaterials) ? v.defaultMaterials : []
  }))
}

export function vehicleRateLabel(vehicle) {
  return vehicle?.rateUnit === 'lMotohour' ? 'л/моточас' : 'л/100 км'
}

export function motohoursWorked(trip) {
  const start = num(trip?.motohourStart)
  const end = num(trip?.motohourEnd)
  if (start !== null && end !== null) return round2(end - start)
  return num(trip?.motohours)
}


export function carriedMotohourReading(previousTrip, opening) {
  const previousEnd = num(previousTrip?.motohourEnd)
  if (previousEnd !== null) return previousEnd
  const openingValue = num(opening?.motohours)
  return openingValue !== null ? openingValue : ''
}

export function resolveVehicle(baseVehicles, state, id) {
  const base = (baseVehicles || []).find(v => v.id === id) || (state?.customVehicles || []).find(v => v.id === id) || null
  if (!base) return null
  const override = state?.vehicleSettings?.[id]
  const merged = override ? { ...base, ...override } : base
  const rateUnit = merged?.rateUnit === 'lMotohour' ? 'lMotohour' : 'l100km'
  return { ...merged, rateUnit, hasMotohours: rateUnit === 'lMotohour' ? true : !!merged?.hasMotohours }
}

export function allVehiclesFrom(baseVehicles, state) {
  const bases = (baseVehicles || []).map(v => resolveVehicle(baseVehicles, state, v.id))
  const custom = (state?.customVehicles || []).map(v => resolveVehicle(baseVehicles, state, v.id))
  return [...bases, ...custom].filter(Boolean)
}
