export {
  ALLOCATION_MODES,
  ALLOC_MINIMIZE,
  ALLOC_NONE,
  ALLOC_PRIORITY,
  ALLOC_PROPORTIONAL,
} from './autoCalc/constants.js'

export {
  defaultAutoCalcForVehicle,
  inferFuelMaterials,
  isCalcCode,
  isReservedCalcCode,
  normalizeAutoCalc,
  normalizeCalcCode,
  normalizeParam,
  normalizeRule,
  vehicleAutoCalc,
} from './autoCalc/config.js'

export {
  evaluateFormula,
  formulaIdentifiers,
  validateFormulaSyntax,
} from './autoCalc/formula.js'

export { allocateConsumption } from './autoCalc/allocation.js'

export {
  autoCalcBaseVariables,
  autoCalcSignature,
  calculateVehicleConsumption,
} from './autoCalc/calculate.js'
