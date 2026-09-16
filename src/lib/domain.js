export {
  BASE_CATALOG,
  BASE_VEHICLES,
  DEFAULT_SETTINGS,
  DEFAULT_STATE,
  STORAGE_VERSION,
  clone,
  uid,
  unique,
} from './domain/defaults.js'

export {
  fmtDate,
  isoDate,
  kmfmt,
  longDate,
  nfmt,
  periodDisplayName,
  periodMonthName,
  periodName,
  periodYear,
  presetDates,
  reportMonthOf,
  safeFile,
  sortedPeriods,
} from './domain/formatting.js'

export {
  materialCellName,
  materialDisplayName,
  materialOf,
  materialSummaryName,
  mergeCatalog,
} from './domain/catalog.js'

export { baseVehicle, vehicleOf, vehicleRateLabel } from './domain/vehicles.js'

export {
  nonZero,
  orderedMaterialNames,
  sortTrips,
  statementMaterialNames,
  syncStatementMaterials,
  tripMaterialNames,
} from './domain/materials.js'

export { migrateState } from './domain/migration.js'

export { buildOpening, createStatement, findPrevStatement } from './domain/statementOpening.js'

export { addTripMaterial, predecessorTrip, prefilledTrip } from './domain/tripPrefill.js'

export { reconcileCarryForward } from './domain/statementCarry.js'

export {
  openingSignature,
  refreshStatementOpening,
  statementOpeningIsCurrent,
} from './domain/autoCarry.js'

export { validateStatement } from './domain/statementValidation.js'
export { statementStatus } from './domain/statementStatus.js'

export {
  lastBalances,
  periodFleetRows,
  stStats,
  totals,
  vehicleHistory,
} from './domain/analytics.js'

export { num, round2, toleranceOf } from './numbers.js'
export { smartBalance } from './calculations.js'
export { motohoursWorked } from './vehicleMetrics.js'
