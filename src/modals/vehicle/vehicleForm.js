import {
  ALLOC_NONE,
  defaultAutoCalcForVehicle,
  normalizeAutoCalc,
  validateFormulaSyntax,
} from '../../lib/autoCalc.js'
import { uid } from '../../lib/domain.js'
import {
  RATE_PER_MOTOHOUR,
  normalizeRateType,
} from '../../lib/vehicleMetrics.js'
import { deepClone, EMPTY_VEHICLE_FORM } from './constants.js'

export function initialVehicleForm(vehicle, catalog) {
  const form = vehicle
    ? { ...deepClone(EMPTY_VEHICLE_FORM), ...deepClone(vehicle) }
    : deepClone(EMPTY_VEHICLE_FORM)

  form.rateType = normalizeRateType(form.rateType)
  if (form.rateType === RATE_PER_MOTOHOUR) form.hasMotohours = true
  form.autoCalc = normalizeAutoCalc(
    vehicle?.autoCalc || defaultAutoCalcForVehicle(form, catalog || []),
  )
  return form
}

export function buildVehicleRecord(form, existingVehicle, state) {
  const shortNo = String(form.shortNo || '').trim()
  const model = String(form.model || '').trim()
  const registrationNumber = String(form.reg || '').trim()

  if (!shortNo || !model) {
    return { error: 'Укажите номер машины и модель.' }
  }

  const duplicateVehicle = (state.vehicles || []).some(
    vehicle =>
      vehicle.id !== existingVehicle?.id &&
      String(vehicle.shortNo).trim().toLowerCase() === shortNo.toLowerCase(),
  )
  if (duplicateVehicle) return { error: 'Машина с таким номером уже есть.' }

  const rateType = normalizeRateType(form.rateType)
  const baseRate = form.baseRate === '' ? null : Number(form.baseRate)
  if (baseRate !== null && (!Number.isFinite(baseRate) || baseRate < 0)) {
    return { error: 'Норма расхода должна быть положительным числом.' }
  }

  const autoCalc = normalizeAutoCalc(form.autoCalc)
  const allCodes = [
    ...autoCalc.params.map(parameter => parameter.code),
    ...autoCalc.rules.map(rule => rule.code),
  ]
  if (new Set(allCodes).size !== allCodes.length) {
    return { error: 'Коды параметров и результатов формул должны быть уникальными.' }
  }

  for (const rule of autoCalc.rules) {
    if (!rule.formula.trim()) return { error: `Заполните формулу правила «${rule.name}».` }
    try {
      validateFormulaSyntax(rule.formula)
    } catch (error) {
      return { error: `Ошибка формулы «${rule.name}»: ${error.message}` }
    }
  }

  const materialRuleNames = new Map()
  for (const rule of autoCalc.rules) {
    if (rule.allocation === ALLOC_NONE) continue
    for (const materialName of rule.materials) {
      if (materialRuleNames.has(materialName)) {
        return {
          error: `Материал «${materialName}» одновременно распределяется правилами «${materialRuleNames.get(materialName)}» и «${rule.name}».`,
        }
      }
      materialRuleNames.set(materialName, rule.name)
    }
  }

  return {
    vehicle: {
      id: existingVehicle?.id || `vehicle_${uid()}`,
      shortNo,
      model,
      reg: registrationNumber,
      baseRate,
      rateType,
      tankCapacity: form.tankCapacity === '' ? null : Number(form.tankCapacity),
      normText: String(form.normText || ''),
      defaultMaterials: Array.isArray(existingVehicle?.defaultMaterials)
        ? existingVehicle.defaultMaterials
        : [],
      hasMotohours: rateType === RATE_PER_MOTOHOUR || Boolean(form.hasMotohours),
      autoCalc,
    },
  }
}
