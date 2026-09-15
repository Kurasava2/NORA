import { num } from '../numbers.js'
import { nfmt } from './formatting.js'
import { tripMaterialNames } from './materials.js'

export function validateTripMaterials({
  trip,
  tripIndex,
  trips,
  statement,
  tripLabel,
  tolerance,
  errors,
  warnings,
}) {
  const materialNames = tripMaterialNames(trip)
  const previousMaterialState =
    tripIndex > 0 ? trips[tripIndex - 1].gsm || {} : statement.opening?.gsm || {}

  validateMissingCarry({
    trip,
    tripIndex,
    previousMaterialState,
    tripLabel,
    tolerance,
    errors,
  })

  for (const materialName of materialNames) {
    validateMaterialEntry({
      trip,
      tripIndex,
      trips,
      statement,
      materialName,
      tripLabel,
      tolerance,
      errors,
      warnings,
    })
  }
}

function validateMissingCarry({
  trip,
  tripIndex,
  previousMaterialState,
  tripLabel,
  tolerance,
  errors,
}) {
  for (const [materialName, previousEntry] of Object.entries(previousMaterialState)) {
    const previousEnd = tripIndex > 0 ? num(previousEntry?.end) : num(previousEntry)
    if (
      previousEnd !== null &&
      Math.abs(previousEnd) > tolerance &&
      !trip.gsm?.[materialName]
    ) {
      errors.push(`${tripLabel}: не перенесён остаток ${materialName} ${nfmt(previousEnd)} л.`)
    }
  }
}

function validateMaterialEntry({
  trip,
  tripIndex,
  trips,
  statement,
  materialName,
  tripLabel,
  tolerance,
  errors,
  warnings,
}) {
  const materialEntry = trip.gsm[materialName] || {}
  const startAmount = num(materialEntry.start)
  const receivedAmount = num(materialEntry.received)
  const spentAmount = num(materialEntry.spent)
  const endAmount = num(materialEntry.end)

  if ([startAmount, receivedAmount, spentAmount, endAmount].every(value => value !== null)) {
    const expectedEnd = startAmount + receivedAmount - spentAmount
    if (Math.abs(expectedEnd - endAmount) > tolerance) {
      errors.push(`${tripLabel}: ${materialName} — остаток должен быть ${nfmt(expectedEnd)} л.`)
    }
  }

  const previousEnd =
    tripIndex > 0
      ? num(trips[tripIndex - 1].gsm?.[materialName]?.end)
      : num(statement.opening?.gsm?.[materialName])

  if (
    previousEnd !== null &&
    Math.abs(previousEnd) > tolerance &&
    startAmount !== null &&
    Math.abs(startAmount - previousEnd) > tolerance
  ) {
    errors.push(`${tripLabel}: начальный остаток ${materialName} не совпадает с предыдущим.`)
  }

  if (trip.unused && ((receivedAmount || 0) !== 0 || (spentAmount || 0) !== 0)) {
    warnings.push(`${tripLabel}: неиспользованная путёвка содержит движение ${materialName}.`)
  }
}
