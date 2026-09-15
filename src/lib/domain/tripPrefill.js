import { num } from '../numbers.js'
import { motohoursEnd } from '../vehicleMetrics.js'
import { clone, uid } from './defaults.js'
import { nonZero, sortTrips } from './materials.js'
import { vehicleOf } from './vehicles.js'

export function predecessorTrip(statement, tripId = null) {
  const trips = clone(statement?.trips || [])
  sortTrips({ trips })

  if (!tripId) return trips[trips.length - 1] || null

  const tripIndex = trips.findIndex(trip => trip.id === tripId)
  return tripIndex > 0 ? trips[tripIndex - 1] : null
}

export function prefilledTrip(state, statement, period, editingTrip = null) {
  if (editingTrip) {
    const trip = clone(editingTrip)
    const vehicle = vehicleOf(state, statement.vehicleId)
    trip.calcInputs = trip.calcInputs || {}

    for (const parameter of vehicle?.autoCalc?.params || []) {
      if (trip.calcInputs[parameter.code] == null) {
        trip.calcInputs[parameter.code] = parameter.defaultValue ?? ''
      }
    }

    return trip
  }

  const previousTrip = predecessorTrip(statement)
  const materialEntries = {}
  const carrySource = previousTrip ? previousTrip.gsm || {} : statement.opening?.gsm || {}

  for (const [materialName, sourceEntry] of Object.entries(carrySource)) {
    const endAmount = previousTrip ? num(sourceEntry?.end) : num(sourceEntry)
    if (endAmount !== null && nonZero(state, endAmount)) {
      materialEntries[materialName] = {
        start: endAmount,
        received: '',
        spent: '',
        end: '',
        _carried: true,
        _autoTarget: '',
        _calcSource: '',
      }
    }
  }

  const motohoursStart = previousTrip
    ? motohoursEnd(previousTrip) ?? ''
    : num(statement.opening?.motohours) ?? ''
  const vehicle = vehicleOf(state, statement.vehicleId)
  const calcInputs = {}

  for (const parameter of vehicle?.autoCalc?.params || []) {
    calcInputs[parameter.code] = parameter.defaultValue ?? ''
  }

  const odometerStart = previousTrip
    ? num(previousTrip.odoEnd) ?? ''
    : num(statement.opening?.odo) ?? ''

  return {
    id: uid(),
    seq: Date.now() + Math.random(),
    date: previousTrip?.date || period.start,
    number: '',
    odoStart: odometerStart,
    odoEnd: odometerStart,
    motohoursStart,
    motohoursEnd: motohoursStart,
    motohours: '',
    unused: false,
    note: '',
    calcInputs,
    autoCalcMeta: null,
    gsm: materialEntries,
  }
}

export function addTripMaterial(state, statement, trip, materialName, editingTripId = null) {
  if (!materialName || trip.gsm?.[materialName]) return trip

  const previousTrip = editingTripId
    ? predecessorTrip(statement, editingTripId)
    : predecessorTrip(statement)
  const previousEnd = previousTrip
    ? num(previousTrip.gsm?.[materialName]?.end)
    : num(statement.opening?.gsm?.[materialName])

  trip.gsm = trip.gsm || {}
  trip.gsm[materialName] = {
    start: previousEnd !== null && nonZero(state, previousEnd) ? previousEnd : '',
    received: '',
    spent: '',
    end: '',
    _carried: previousEnd !== null && nonZero(state, previousEnd),
    _autoTarget: '',
    _calcSource: '',
  }

  return trip
}
