import {
  materialDisplayName,
  nfmt,
  nonZero,
  num,
  predecessorTrip,
} from '../../lib/domain.js'
import { basicTripErrors } from '../../lib/tripValidation.js'

export function tripFormErrors({
  form,
  period,
  statement,
  vehicle,
  state,
  editingId,
}) {
  const errors = basicTripErrors(form, {
    period,
    hasMotohours: Boolean(vehicle.hasMotohours),
    materialLabel: materialDisplayName,
  }).map(message =>
    message
      .replace(/^Не указана дата\.$/, 'Укажите дату.')
      .replace(/^Не указан номер путёвки\.$/, 'Укажите номер путёвки.'),
  )

  const waybillNumber = String(form.number || '').trim()
  const duplicateNumber =
    waybillNumber &&
    statement.trips.some(
      trip => trip.id !== editingId && String(trip.number || '').trim() === waybillNumber,
    )
  if (duplicateNumber) errors.push('Такой номер путёвки уже есть в этой ведомости.')

  const previousTrip = editingId
    ? predecessorTrip(statement, editingId)
    : predecessorTrip(statement)
  const carrySource = previousTrip ? previousTrip.gsm || {} : statement.opening?.gsm || {}

  for (const [materialName, materialEntry] of Object.entries(carrySource)) {
    const endingBalance = previousTrip ? num(materialEntry?.end) : num(materialEntry)
    if (
      endingBalance !== null &&
      nonZero(state, endingBalance) &&
      !form.gsm?.[materialName]
    ) {
      errors.push(
        `Перенесите остаток ${materialDisplayName(materialName)}: ${nfmt(endingBalance)} л.`,
      )
    }
  }

  return errors
}
