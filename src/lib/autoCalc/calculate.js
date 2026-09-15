import { num } from '../numbers.js'
import { roundToStep } from './allocation.js'
import {
  normalizeCalcCode,
  normalizeRule,
  vehicleAutoCalc,
} from './config.js'
import { evaluateFormula, formulaIdentifiers } from './formula.js'
import { allocateRuleConsumption } from './ruleAllocation.js'

export function autoCalcBaseVariables(vehicle, trip) {
  const odometerStart = num(trip?.odoStart)
  const odometerEnd = num(trip?.odoEnd)
  const motohoursStart = num(trip?.motohoursStart)
  const motohoursEnd = num(trip?.motohoursEnd)

  const mileage =
    odometerStart !== null && odometerEnd !== null ? odometerEnd - odometerStart : null
  const workedMotohours =
    motohoursStart !== null && motohoursEnd !== null
      ? motohoursEnd - motohoursStart
      : num(trip?.motohours)

  const variables = {
    КМ: mileage,
    МОТОЧАСЫ: workedMotohours,
    НОРМА: num(vehicle?.baseRate),
  }

  for (const [inputCode, inputValue] of Object.entries(trip?.calcInputs || {})) {
    variables[normalizeCalcCode(inputCode)] = num(inputValue)
  }

  return variables
}

export function autoCalcSignature(vehicle, trip) {
  const config = vehicleAutoCalc(vehicle, [])
  const materials = [...new Set(config.rules.flatMap(rule => rule.materials || []))].sort()
  const balances = {}

  for (const materialName of materials) {
    const materialEntry = trip?.gsm?.[materialName] || {}
    balances[materialName] = {
      start: num(materialEntry.start),
      received: num(materialEntry.received),
      manualSpent:
        materialEntry._calcSource === 'manual' ? num(materialEntry.spent) : null,
      manualEnd:
        materialEntry._calcSource === 'manual' ? num(materialEntry.end) : null,
    }
  }

  return JSON.stringify({
    vars: autoCalcBaseVariables(vehicle, trip),
    inputs: trip?.calcInputs || {},
    balances,
  })
}

export function calculateVehicleConsumption(vehicle, trip, catalog = []) {
  const config = vehicleAutoCalc(vehicle, catalog)
  if (!config.enabled) {
    return {
      ok: false,
      errors: ['Автоматический расчёт выключен для этой машины.'],
      rules: [],
      variables: {},
    }
  }

  const baseVariables = autoCalcBaseVariables(vehicle, trip)
  const rules = config.rules.map(normalizeRule)
  const rulesByCode = new Map()
  const errors = []

  for (const rule of rules) {
    if (rulesByCode.has(rule.code)) errors.push(`Повторяется код результата «${rule.code}».`)
    else rulesByCode.set(rule.code, rule)
  }

  const variables = { ...baseVariables }
  for (const parameter of config.params) {
    const parameterCode = normalizeCalcCode(parameter.code)
    const parameterValue = variables[parameterCode] ?? num(parameter.defaultValue)
    if (parameterValue !== null) variables[parameterCode] = parameterValue
  }

  const inputVariables = { ...variables }
  const completedRules = new Map()
  const visitingRuleCodes = new Set()

  const evaluateRule = rule => {
    if (completedRules.has(rule.code)) return completedRules.get(rule.code)
    if (visitingRuleCodes.has(rule.code)) {
      throw new Error(
        `Циклическая зависимость правил: ${[...visitingRuleCodes, rule.code].join(' → ')}`,
      )
    }

    visitingRuleCodes.add(rule.code)

    try {
      for (const identifier of formulaIdentifiers(rule.formula)) {
        if (rulesByCode.has(identifier) && !completedRules.has(identifier)) {
          const dependencyResult = evaluateRule(rulesByCode.get(identifier))
          variables[identifier] = dependencyResult.value
        }
      }

      let calculatedValue = evaluateFormula(rule.formula, variables)
      if (calculatedValue < 0) {
        throw new Error(`Правило «${rule.name}» дало отрицательный расход`)
      }

      calculatedValue = roundToStep(calculatedValue, rule.rounding)
      variables[rule.code] = calculatedValue

      const allocation = allocateRuleConsumption(calculatedValue, rule, trip)
      const result = { ...rule, value: calculatedValue, ...allocation }
      completedRules.set(rule.code, result)
      return result
    } finally {
      visitingRuleCodes.delete(rule.code)
    }
  }

  const calculatedRules = []
  for (const rule of rules) {
    try {
      calculatedRules.push(evaluateRule(rule))
    } catch (error) {
      errors.push(`${rule.name}: ${error.message}`)
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    rules: calculatedRules,
    variables,
    inputVariables,
    signature: autoCalcSignature(vehicle, trip),
  }
}
