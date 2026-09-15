import { num } from '../numbers.js'
import { allocateConsumption, roundToStep } from './allocation.js'
import { ALLOC_NONE } from './constants.js'

function availableAmount(materialEntry) {
  const startAmount = num(materialEntry?.start) || 0
  const receivedAmount = num(materialEntry?.received) || 0
  return Math.max(0, startAmount + receivedAmount)
}

function manualAllocation(material, materialEntry, rounding) {
  const spentAmount = Math.max(0, num(materialEntry?.spent) || 0)
  const available = availableAmount(materialEntry)
  const enteredEnd = num(materialEntry?.end)

  return {
    material,
    available,
    spent: spentAmount,
    end:
      enteredEnd === null
        ? roundToStep(Math.max(0, available - spentAmount), rounding)
        : enteredEnd,
    locked: true,
  }
}

export function allocateRuleConsumption(calculatedValue, rule, trip) {
  if (rule.allocation === ALLOC_NONE) {
    return allocateConsumption(
      calculatedValue,
      rule.materials,
      trip?.gsm || {},
      rule.allocation,
      rule.priority,
      rule.rounding,
    )
  }

  const materialEntries = trip?.gsm || {}
  const lockedAllocations = new Map()
  const automaticMaterials = []
  let manualSpent = 0

  for (const materialName of rule.materials) {
    const materialEntry = materialEntries[materialName]
    const hasManualSpent =
      materialEntry?._calcSource === 'manual' && num(materialEntry?.spent) !== null

    if (!hasManualSpent) {
      automaticMaterials.push(materialName)
      continue
    }

    const allocation = manualAllocation(materialName, materialEntry, rule.rounding)
    lockedAllocations.set(materialName, allocation)
    manualSpent += allocation.spent
  }

  const automaticTarget = Math.max(0, calculatedValue - manualSpent)
  const automaticResult = allocateConsumption(
    automaticTarget,
    automaticMaterials,
    materialEntries,
    rule.allocation,
    rule.priority,
    rule.rounding,
  )
  const automaticAllocations = new Map(
    automaticResult.allocations.map(allocation => [allocation.material, allocation]),
  )
  const allocations = rule.materials
    .map(materialName =>
      lockedAllocations.get(materialName) || automaticAllocations.get(materialName),
    )
    .filter(Boolean)

  return {
    ...automaticResult,
    allocations,
    manualSpent: roundToStep(manualSpent, rule.rounding),
    manualExcess: roundToStep(Math.max(0, manualSpent - calculatedValue), rule.rounding),
  }
}
