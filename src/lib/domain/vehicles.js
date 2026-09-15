import { num } from '../numbers.js'
import {
  RATE_PER_MOTOHOUR,
  normalizeRateType,
  rateUnitLabel,
} from '../vehicleMetrics.js'
import {
  defaultAutoCalcForVehicle,
  normalizeAutoCalc,
} from '../autoCalc.js'
import { BASE_VEHICLES } from './defaults.js'
import { nfmt } from './formatting.js'

export const baseVehicle = vehicleId =>
  BASE_VEHICLES.find(vehicle => vehicle.id === vehicleId) || null

export function vehicleOf(state, vehicleId) {
  const vehicleList = state?.vehicles
  const baseVehicleData = Array.isArray(vehicleList)
    ? vehicleList.find(vehicle => vehicle.id === vehicleId)
    : baseVehicle(vehicleId)

  if (!baseVehicleData) return null

  const vehicleOverrides = state.vehicleSettings?.[vehicleId]
  const mergedVehicle = vehicleOverrides
    ? { ...baseVehicleData, ...vehicleOverrides }
    : baseVehicleData
  const rateType = normalizeRateType(mergedVehicle.rateType)

  return {
    ...mergedVehicle,
    rateType,
    hasMotohours: Boolean(mergedVehicle.hasMotohours) || rateType === RATE_PER_MOTOHOUR,
    autoCalc: normalizeAutoCalc(
      mergedVehicle.autoCalc ||
        defaultAutoCalcForVehicle(
          { ...mergedVehicle, rateType },
          state?.catalog || [],
        ),
    ),
  }
}

export function vehicleRateLabel(vehicle) {
  const baseRate = num(vehicle?.baseRate)
  return baseRate === null ? 'по документу' : `${nfmt(baseRate)} ${rateUnitLabel(vehicle)}`
}
