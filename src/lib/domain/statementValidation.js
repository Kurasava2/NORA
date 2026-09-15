import { num, toleranceOf } from '../numbers.js'
import { basicTripErrors } from '../tripValidation.js'
import { motohoursEnd } from '../vehicleMetrics.js'
import { materialDisplayName } from './catalog.js'
import { fmtDate } from './formatting.js'
import { validateTripMaterials } from './tripMaterialValidation.js'
import { vehicleOf } from './vehicles.js'

export function validateStatement(state, statement, period) {
  const vehicle = vehicleOf(state, statement.vehicleId)
  const tolerance = toleranceOf(state.settings.tolerance)
  const errors = []
  const warnings = []
  const trips = statement.trips || []

  if (!trips.length) return { errors, warnings, ok: true, idle: true }

  const usedWaybillNumbers = new Set()

  trips.forEach((trip, tripIndex) => {
    const tripLabel = `Путёвка №${trip.number || '?'} (${fmtDate(trip.date)})`

    validateBasicTripFields({
      trip,
      tripIndex,
      trips,
      statement,
      period,
      vehicle,
      tripLabel,
      usedWaybillNumbers,
      errors,
    })

    validateTripMaterials({
      trip,
      tripIndex,
      trips,
      statement,
      tripLabel,
      tolerance,
      errors,
      warnings,
    })

    if (trip.unused && !String(trip.note || '').toLowerCase().includes('неисп')) {
      warnings.push(`${tripLabel}: добавьте «неиспользованный» в примечание.`)
    }
  })

  if (statement.opening?.sourceHasErrors) {
    warnings.push('Перенос сделан из ведомости с ошибками.')
  }

  return { errors, warnings, ok: !errors.length }
}

function validateBasicTripFields({
  trip,
  tripIndex,
  trips,
  statement,
  period,
  vehicle,
  tripLabel,
  usedWaybillNumbers,
  errors,
}) {
  for (const message of basicTripErrors(trip, {
    period,
    hasMotohours: Boolean(vehicle?.hasMotohours),
    materialLabel: materialDisplayName,
  })) {
    errors.push(`${tripLabel}: ${message}`)
  }

  const waybillNumber = String(trip.number || '').trim()
  if (waybillNumber) {
    if (usedWaybillNumbers.has(waybillNumber)) errors.push(`${tripLabel}: номер дублируется.`)
    usedWaybillNumbers.add(waybillNumber)
  }

  validateOdometerContinuity({ trip, tripIndex, trips, statement, tripLabel, errors })
  if (vehicle?.hasMotohours) {
    validateMotohoursContinuity({ trip, tripIndex, trips, statement, tripLabel, errors })
  }
}

function validateOdometerContinuity({ trip, tripIndex, trips, statement, tripLabel, errors }) {
  const odometerStart = num(trip.odoStart)
  const odometerEnd = num(trip.odoEnd)

  if (
    trip.unused &&
    odometerStart !== null &&
    odometerEnd !== null &&
    Math.abs(odometerEnd - odometerStart) > 0.001
  ) {
    errors.push(`${tripLabel}: неиспользованная путёвка имеет пробег.`)
  }

  if (
    tripIndex === 0 &&
    statement.opening?.odo != null &&
    odometerStart !== null &&
    Math.abs(odometerStart - statement.opening.odo) > 0.001
  ) {
    errors.push(`${tripLabel}: начальный одометр не совпадает с предыдущим периодом.`)
  }

  if (tripIndex > 0) {
    const previousOdometerEnd = num(trips[tripIndex - 1].odoEnd)
    if (
      previousOdometerEnd !== null &&
      odometerStart !== null &&
      Math.abs(odometerStart - previousOdometerEnd) > 0.001
    ) {
      errors.push(`${tripLabel}: начальный одометр не совпадает с предыдущей путёвкой.`)
    }
  }
}

function validateMotohoursContinuity({
  trip,
  tripIndex,
  trips,
  statement,
  tripLabel,
  errors,
}) {
  const motohoursStart = num(trip.motohoursStart)
  const motohoursEndValue = num(trip.motohoursEnd)

  if (
    trip.unused &&
    motohoursStart !== null &&
    motohoursEndValue !== null &&
    Math.abs(motohoursEndValue - motohoursStart) > 0.001
  ) {
    errors.push(`${tripLabel}: неиспользованная путёвка имеет наработку моточасов.`)
  }

  if (motohoursStart === null) return

  if (
    tripIndex === 0 &&
    statement.opening?.motohours != null &&
    Math.abs(motohoursStart - Number(statement.opening.motohours)) > 0.001
  ) {
    errors.push(`${tripLabel}: начальные моточасы не совпадают с предыдущим периодом.`)
  }

  if (tripIndex > 0) {
    const previousMotohoursEnd = motohoursEnd(trips[tripIndex - 1])
    if (
      previousMotohoursEnd !== null &&
      Math.abs(motohoursStart - previousMotohoursEnd) > 0.001
    ) {
      errors.push(`${tripLabel}: начальные моточасы не совпадают с предыдущей путёвкой.`)
    }
  }
}
