import { num } from './numbers.js'

export const RATE_PER_100KM = 'per100km'
export const RATE_PER_MOTOHOUR = 'perMotohour'

export function normalizeRateType(value) {
  return value === RATE_PER_MOTOHOUR ? RATE_PER_MOTOHOUR : RATE_PER_100KM
}

export function usesMotohourRate(vehicle) {
  return normalizeRateType(vehicle?.rateType) === RATE_PER_MOTOHOUR
}

export function rateUnitLabel(vehicle) {
  return usesMotohourRate(vehicle) ? 'л/моточас' : 'л/100 км'
}

export function motohoursWorked(trip) {
  const start = num(trip?.motohoursStart)
  const end = num(trip?.motohoursEnd)
  if (start !== null && end !== null) return end - start
  return num(trip?.motohours)
}

export function motohoursStart(trip) {
  return num(trip?.motohoursStart)
}

export function motohoursEnd(trip) {
  return num(trip?.motohoursEnd)
}

export function hasMotohourCounterPair(trip) {
  return motohoursStart(trip) !== null && motohoursEnd(trip) !== null
}
