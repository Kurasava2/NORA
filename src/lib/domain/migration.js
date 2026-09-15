import { RATE_PER_MOTOHOUR, normalizeRateType } from '../vehicleMetrics.js'
import {
  defaultAutoCalcForVehicle,
  normalizeAutoCalc,
} from '../autoCalc.js'
import {
  BASE_VEHICLES,
  DEFAULT_SETTINGS,
  DEFAULT_STATE,
  STORAGE_VERSION,
  clone,
  uid,
} from './defaults.js'
import { mergeCatalog } from './catalog.js'
import { sortTrips, syncStatementMaterials } from './materials.js'

export function migrateState(input) {
  const sourceState = input && typeof input === 'object' ? input : null
  const sourceVersion = Number(sourceState?.version || 0)
  const state = sourceState ? clone(sourceState) : clone(DEFAULT_STATE)

  state.version = STORAGE_VERSION
  state.settings = { ...DEFAULT_SETTINGS, ...(state.settings || {}) }
  state.periods = Array.isArray(state.periods) ? state.periods : []
  state.vehicleSettings = state.vehicleSettings || {}
  state.catalog = mergeCatalog(
    Array.isArray(state.catalog) ? state.catalog : [],
    sourceVersion < 7,
  )

  const normalizeVehicle = inputVehicle => {
    const vehicle = { ...inputVehicle }
    const rateType = normalizeRateType(vehicle.rateType)

    vehicle.id = String(vehicle.id || vehicle.shortNo || uid())
    vehicle.shortNo = String(vehicle.shortNo || vehicle.id || '')
    vehicle.model = String(vehicle.model || '')
    vehicle.reg = String(vehicle.reg || '')
    vehicle.defaultMaterials = Array.isArray(vehicle.defaultMaterials)
      ? vehicle.defaultMaterials
      : []
    vehicle.rateType = rateType
    vehicle.hasMotohours = Boolean(vehicle.hasMotohours) || rateType === RATE_PER_MOTOHOUR
    vehicle.autoCalc = normalizeAutoCalc(
      vehicle.autoCalc || defaultAutoCalcForVehicle(vehicle, state.catalog),
    )

    return vehicle
  }

  if (Array.isArray(state.vehicles)) {
    state.vehicles = state.vehicles.map(normalizeVehicle)
  } else {
    state.vehicles = clone(BASE_VEHICLES).map(baseVehicle =>
      normalizeVehicle({
        ...baseVehicle,
        ...(state.vehicleSettings?.[baseVehicle.id] || {}),
      }),
    )
  }

  for (const period of state.periods) {
    period.reportMonth =
      period.reportMonth || String(period.end || period.start || '').slice(0, 7)
    period.statements = Array.isArray(period.statements) ? period.statements : []

    for (const statement of period.statements) {
      statement.materials = []
      statement.trips = Array.isArray(statement.trips) ? statement.trips : []
      statement.opening = statement.opening || null

      for (const trip of statement.trips) {
        trip.gsm = trip.gsm || {}
        trip.calcInputs = trip.calcInputs || {}
        trip.autoCalcMeta = trip.autoCalcMeta || null
        trip.seq = trip.seq || Date.now() + Math.random()

        for (const materialEntry of Object.values(trip.gsm)) {
          if (!materialEntry || typeof materialEntry !== 'object') continue
          materialEntry._carried = Boolean(materialEntry._carried)
          materialEntry._autoTarget = materialEntry._autoTarget || ''
          materialEntry._calcSource = materialEntry._calcSource || ''
        }
      }

      sortTrips(statement)
      syncStatementMaterials(statement)
    }
  }

  return state
}
