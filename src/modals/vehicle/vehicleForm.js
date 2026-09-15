import {
  ALLOC_NONE,
  defaultAutoCalcForVehicle,
  formulaIdentifiers,
  isReservedCalcCode,
  normalizeAutoCalc,
  validateFormulaSyntax,
} from '../../lib/autoCalc.js'
import { num, uid } from '../../lib/domain.js'
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

function numericFormValue(value, label) {
  if (String(value ?? '').trim() === '') return { value: null }
  const parsedValue = num(value)
  if (parsedValue === null || parsedValue < 0) {
    return { error: `${label} должна быть положительным числом.` }
  }
  return { value: parsedValue }
}

function validateAutoCalculation(autoCalc) {
  const allCodes = [
    ...autoCalc.params.map(parameter => parameter.code),
    ...autoCalc.rules.map(rule => rule.code),
  ]
  if (new Set(allCodes).size !== allCodes.length) {
    return 'Коды параметров и результатов формул должны быть уникальными.'
  }

  const reservedCode = allCodes.find(isReservedCalcCode)
  if (reservedCode) {
    return `Код «${reservedCode}» зарезервирован встроенным параметром формулы.`
  }

  for (const parameter of autoCalc.params) {
    const defaultText = String(parameter.defaultValue ?? '').trim()
    if (defaultText && num(defaultText) === null) {
      return `Параметр «${parameter.label}»: значение по умолчанию должно быть числом.`
    }
  }

  const availableCodes = new Set(allCodes)
  for (const rule of autoCalc.rules) {
    if (!rule.formula.trim()) return `Заполните формулу правила «${rule.name}».`
    try {
      validateFormulaSyntax(rule.formula)
      const unknownIdentifier = formulaIdentifiers(rule.formula).find(
        identifier => !isReservedCalcCode(identifier) && !availableCodes.has(identifier),
      )
      if (unknownIdentifier) {
        return `Формула «${rule.name}»: неизвестный параметр «${unknownIdentifier}».`
      }
    } catch (error) {
      return `Ошибка формулы «${rule.name}»: ${error.message}`
    }
  }

  const materialRuleNames = new Map()
  for (const rule of autoCalc.rules) {
    if (rule.allocation === ALLOC_NONE) continue
    for (const materialName of rule.materials) {
      if (materialRuleNames.has(materialName)) {
        return `Материал «${materialName}» одновременно распределяется правилами «${materialRuleNames.get(materialName)}» и «${rule.name}».`
      }
      materialRuleNames.set(materialName, rule.name)
    }
  }
  return ''
}

export function buildVehicleRecord(form, existingVehicle, state) {
  const shortNo = String(form.shortNo || '').trim()
  const model = String(form.model || '').trim()
  const registrationNumber = String(form.reg || '').trim()
  if (!shortNo || !model) return { error: 'Укажите номер машины и модель.' }

  const duplicateVehicle = (state.vehicles || []).some(
    vehicle =>
      vehicle.id !== existingVehicle?.id &&
      String(vehicle.shortNo).trim().toLowerCase() === shortNo.toLowerCase(),
  )
  if (duplicateVehicle) return { error: 'Машина с таким номером уже есть.' }

  const rateType = normalizeRateType(form.rateType)
  const rateResult = numericFormValue(form.baseRate, 'Норма расхода')
  if (rateResult.error) return { error: rateResult.error }
  const tankResult = numericFormValue(form.tankCapacity, 'Вместимость бака')
  if (tankResult.error) return { error: tankResult.error }

  const autoCalc = normalizeAutoCalc(form.autoCalc)
  const autoCalcError = validateAutoCalculation(autoCalc)
  if (autoCalcError) return { error: autoCalcError }

  return {
    vehicle: {
      id: existingVehicle?.id || `vehicle_${uid()}`,
      shortNo,
      model,
      reg: registrationNumber,
      baseRate: rateResult.value,
      rateType,
      tankCapacity: tankResult.value,
      normText: String(form.normText || ''),
      defaultMaterials: Array.isArray(existingVehicle?.defaultMaterials)
        ? existingVehicle.defaultMaterials
        : [],
      hasMotohours: rateType === RATE_PER_MOTOHOUR || Boolean(form.hasMotohours),
      autoCalc,
    },
  }
}
