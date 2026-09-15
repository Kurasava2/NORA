import { num, toleranceOf } from '../numbers.js'
import { syncCarriedStart } from '../carry.js'
import { sortTrips, syncStatementMaterials } from './materials.js'

export function reconcileCarryForward(state, statement) {
  if (!statement) return

  sortTrips(statement)
  const tolerance = toleranceOf(state?.settings?.tolerance)

  for (let tripIndex = 0; tripIndex < statement.trips.length; tripIndex += 1) {
    const trip = statement.trips[tripIndex]
    trip.gsm = trip.gsm || {}

    const carrySource =
      tripIndex > 0 ? statement.trips[tripIndex - 1].gsm || {} : statement.opening?.gsm || {}

    addMissingCarriedMaterials(trip, carrySource, tripIndex, tolerance)
    removeFinishedCarriedMaterials(trip, carrySource, tripIndex, tolerance)
  }

  syncStatementMaterials(statement)
}

function addMissingCarriedMaterials(trip, carrySource, tripIndex, tolerance) {
  for (const [materialName, sourceEntry] of Object.entries(carrySource)) {
    const previousEnd = tripIndex > 0 ? num(sourceEntry?.end) : num(sourceEntry)
    if (previousEnd === null || Math.abs(previousEnd) <= tolerance) continue

    if (!trip.gsm[materialName]) {
      trip.gsm[materialName] = {
        start: previousEnd,
        received: '',
        spent: '',
        end: '',
        _carried: true,
        _autoTarget: '',
        _calcSource: '',
      }
    } else {
      syncCarriedStart(trip.gsm[materialName], previousEnd, tolerance)
    }
  }
}

function removeFinishedCarriedMaterials(trip, carrySource, tripIndex, tolerance) {
  for (const [materialName, materialEntry] of Object.entries({ ...trip.gsm })) {
    const sourceEntry = carrySource[materialName]
    const previousEnd = tripIndex > 0 ? num(sourceEntry?.end) : num(sourceEntry)

    if (
      (previousEnd !== null && Math.abs(previousEnd) > tolerance) ||
      !materialEntry?._carried
    ) {
      continue
    }

    const startAmount = num(materialEntry.start)
    const receivedAmount = num(materialEntry.received)
    const spentAmount = num(materialEntry.spent)
    const endAmount = num(materialEntry.end)
    const noMovement =
      (receivedAmount === null || Math.abs(receivedAmount) <= tolerance) &&
      (spentAmount === null || Math.abs(spentAmount) <= tolerance)
    const onlyCarriedBalance =
      noMovement &&
      (endAmount === null ||
        startAmount === null ||
        Math.abs(endAmount - startAmount) <= tolerance ||
        Math.abs(endAmount) <= tolerance)

    if (onlyCarriedBalance) {
      delete trip.gsm[materialName]
    } else {
      materialEntry.start = ''
      materialEntry._carried = false
      if (materialEntry._autoTarget === 'start') materialEntry._autoTarget = ''
    }
  }
}
