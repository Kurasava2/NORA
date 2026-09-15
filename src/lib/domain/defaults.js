import baseVehicles from '../../data/vehicles.json'
import baseCatalog from '../../data/catalog.json'

export const BASE_VEHICLES = baseVehicles
export const BASE_CATALOG = baseCatalog
export const STORAGE_VERSION = 10

export const DEFAULT_SETTINGS = {
  unit: 'Командир автомобильной роты войсковой части 98562',
  rank: 'капитан',
  commander: 'А. Геращенко',
  tolerance: 0.05,
  regMode: 'full',
  autosave: true,
  autosaveDelay: 400,
  directPrint: false,
  preferredPrinter: '',
  performanceMode: true,
}

export const DEFAULT_STATE = {
  version: STORAGE_VERSION,
  settings: DEFAULT_SETTINGS,
  periods: [],
  vehicleSettings: {},
  vehicles: baseVehicles.map(vehicle => ({
    ...vehicle,
    defaultMaterials: [...(vehicle.defaultMaterials || [])],
  })),
  decoding: { documents: [], densityLots: [], allocations: [], containers: [] },
  catalog: baseCatalog.map(material => ({
    ...material,
    aliases: [...(material.aliases || [])],
    sourceVehicles: [...(material.sourceVehicles || [])],
  })),
}

export const clone = value =>
  typeof globalThis.structuredClone === 'function'
    ? globalThis.structuredClone(value)
    : JSON.parse(JSON.stringify(value))

export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`

export const unique = values => [...new Set((values || []).filter(Boolean))]
