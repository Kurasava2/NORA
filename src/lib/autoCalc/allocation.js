import { num, round2 } from '../numbers.js'
import {
  ALLOC_MINIMIZE,
  ALLOC_NONE,
  ALLOC_PRIORITY,
  ALLOC_PROPORTIONAL,
} from './constants.js'

export function roundToStep(value, step = 0.01) {
  const numericStep = num(step)
  if (numericStep === null || numericStep <= 0) return round2(value)

  const roundedValue = Math.round((value + Number.EPSILON) / numericStep) * numericStep
  return Math.round((roundedValue + Number.EPSILON) * 1e6) / 1e6
}

function availableMaterialAmount(materialEntry) {
  const openingAmount = num(materialEntry?.start) || 0
  const receivedAmount = num(materialEntry?.received) || 0
  return Math.max(0, openingAmount + receivedAmount)
}

export function allocateConsumption(
  total,
  materials,
  materialEntries,
  mode = ALLOC_MINIMIZE,
  priority = [],
  rounding = 0.01,
) {
  let remainingAmount = Math.max(0, num(total) || 0)

  const materialRows = (materials || [])
    .map((material, originalIndex) => ({
      material,
      originalIndex,
      available: availableMaterialAmount(materialEntries?.[material]),
    }))
    .filter(row => row.available > 0 || materialEntries?.[row.material])

  const allocationByMaterial = new Map(
    materialRows.map(row => [
      row.material,
      {
        material: row.material,
        available: row.available,
        spent: 0,
        end: row.available,
      },
    ]),
  )

  if (mode === ALLOC_NONE) {
    return {
      allocations: [...allocationByMaterial.values()],
      shortage: remainingAmount,
      unallocated: remainingAmount,
    }
  }

  let orderedRows = [...materialRows]
  if (mode === ALLOC_MINIMIZE) {
    orderedRows.sort(
      (firstRow, secondRow) =>
        firstRow.available - secondRow.available ||
        firstRow.originalIndex - secondRow.originalIndex,
    )
  }

  if (mode === ALLOC_PRIORITY) {
    const priorityPosition = new Map(
      (priority || []).map((materialName, index) => [materialName, index]),
    )
    orderedRows.sort(
      (firstRow, secondRow) =>
        (priorityPosition.get(firstRow.material) ?? 9999) -
          (priorityPosition.get(secondRow.material) ?? 9999) ||
        firstRow.originalIndex - secondRow.originalIndex,
    )
  }

  if (mode === ALLOC_PROPORTIONAL) {
    const totalAvailable = materialRows.reduce(
      (sum, materialRow) => sum + materialRow.available,
      0,
    )
    const amountToUse = Math.min(remainingAmount, totalAvailable)
    let assignedAmount = 0

    materialRows.forEach((materialRow, rowIndex) => {
      let spentAmount =
        rowIndex === materialRows.length - 1
          ? amountToUse - assignedAmount
          : roundToStep(
              totalAvailable ? (amountToUse * materialRow.available) / totalAvailable : 0,
              rounding,
            )

      spentAmount = Math.min(materialRow.available, Math.max(0, spentAmount))
      assignedAmount += spentAmount

      const allocation = allocationByMaterial.get(materialRow.material)
      allocation.spent = spentAmount
      allocation.end = roundToStep(materialRow.available - spentAmount, rounding)
    })

    remainingAmount = Math.max(0, (num(total) || 0) - assignedAmount)
    const roundedRemainingAmount = roundToStep(remainingAmount, rounding)

    return {
      allocations: [...allocationByMaterial.values()],
      shortage: roundedRemainingAmount,
      unallocated: roundedRemainingAmount,
    }
  }

  for (const materialRow of orderedRows) {
    if (remainingAmount <= 1e-9) break

    const spentAmount = Math.min(materialRow.available, remainingAmount)
    const allocation = allocationByMaterial.get(materialRow.material)
    allocation.spent = roundToStep(spentAmount, rounding)
    allocation.end = roundToStep(materialRow.available - spentAmount, rounding)
    remainingAmount = roundToStep(remainingAmount - spentAmount, rounding)
  }

  const roundedRemainingAmount = Math.max(0, roundToStep(remainingAmount, rounding))
  return {
    allocations: [...allocationByMaterial.values()],
    shortage: roundedRemainingAmount,
    unallocated: roundedRemainingAmount,
  }
}
