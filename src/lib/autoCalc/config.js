import { num } from '../numbers.js'
import { RATE_PER_MOTOHOUR, normalizeRateType } from '../vehicleMetrics.js'
import {
  ALLOCATION_MODES,
  ALLOC_MINIMIZE,
} from './constants.js'

export function normalizeCalcCode(value, fallback = '') {
  const upperCaseValue = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/Ё/g, 'Е')

  const normalizedValue = upperCaseValue
    .replace(/[^A-ZА-Я0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

  return normalizedValue || fallback
}

export function isCalcCode(value) {
  return /^[A-ZА-Я_][A-ZА-Я0-9_]*$/.test(normalizeCalcCode(value))
}

export function normalizeParam(parameter = {}) {
  const code = normalizeCalcCode(parameter.code || parameter.label || 'ПАРАМЕТР')

  return {
    id: String(parameter.id || code || Date.now()),
    code,
    label: String(parameter.label || code),
    defaultValue: parameter.defaultValue == null ? '' : parameter.defaultValue,
  }
}

export function normalizeRule(rule = {}) {
  const code = normalizeCalcCode(rule.code || rule.name || 'РАСХОД')
  const allocation = ALLOCATION_MODES.includes(rule.allocation)
    ? rule.allocation
    : ALLOC_MINIMIZE
  const requestedRounding = num(rule.rounding)
  const rounding = requestedRounding !== null && requestedRounding > 0 ? requestedRounding : 0.01

  return {
    id: String(rule.id || code || Date.now()),
    name: String(rule.name || code),
    code,
    formula: String(rule.formula || ''),
    materials: [...new Set((rule.materials || []).map(String).filter(Boolean))],
    allocation,
    priority: [...new Set((rule.priority || []).map(String).filter(Boolean))],
    rounding,
  }
}

export function normalizeAutoCalc(config = {}) {
  return {
    enabled: config?.enabled !== false,
    params: Array.isArray(config?.params) ? config.params.map(normalizeParam) : [],
    rules: Array.isArray(config?.rules) ? config.rules.map(normalizeRule) : [],
  }
}

export function inferFuelMaterials(vehicle, catalog = []) {
  const vehicleId = String(vehicle?.id || '')
  const defaultMaterials = new Set((vehicle?.defaultMaterials || []).map(String))

  const linkedFuelMaterials = (catalog || [])
    .filter(material => {
      const isFuel = String(material.category || '').toLowerCase() === 'топливо'
      const linkedVehicles = (material.sourceVehicles || []).map(String)
      return isFuel && (linkedVehicles.includes(vehicleId) || defaultMaterials.has(material.name))
    })
    .map(material => material.name)

  const fallbackFuelMaterials = [...(vehicle?.defaultMaterials || [])].filter(materialName =>
    /^Д[тТ](?:\s|$)/.test(String(materialName)),
  )

  return [...new Set([...linkedFuelMaterials, ...fallbackFuelMaterials])]
}

export function defaultAutoCalcForVehicle(vehicle, catalog = []) {
  const baseRate = num(vehicle?.baseRate)
  if (baseRate === null || baseRate < 0) {
    return { enabled: true, params: [], rules: [] }
  }

  const rateType = normalizeRateType(vehicle?.rateType)
  const materials = inferFuelMaterials(vehicle, catalog)

  return normalizeAutoCalc({
    enabled: true,
    params: [],
    rules: [
      {
        id: 'rule_fuel',
        name: 'Топливо',
        code: 'ТОПЛИВО',
        formula: rateType === RATE_PER_MOTOHOUR ? 'МОТОЧАСЫ * НОРМА' : 'КМ * НОРМА / 100',
        materials,
        allocation: ALLOC_MINIMIZE,
        priority: materials,
        rounding: 0.01,
      },
    ],
  })
}

export function vehicleAutoCalc(vehicle, catalog = []) {
  return normalizeAutoCalc(vehicle?.autoCalc || defaultAutoCalcForVehicle(vehicle, catalog))
}
