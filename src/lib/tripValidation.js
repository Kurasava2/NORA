import { num } from './numbers.js'
import { hasMotohourCounterPair, motohoursWorked } from './vehicleMetrics.js'

export function basicTripErrors(trip, { period = null, hasMotohours = false, materialLabel = name => name } = {}) {
  const errors = []
  const date = String(trip?.date || '')
  const number = String(trip?.number || '').trim()
  const odoStart = num(trip?.odoStart)
  const odoEnd = num(trip?.odoEnd)

  if (!date) errors.push('Не указана дата.')
  else if (period && (date < period.start || date > period.end)) errors.push('Дата вне расчётного периода.')
  if (!number) errors.push('Не указан номер путёвки.')

  if (odoStart === null || odoEnd === null) errors.push('Не заполнены оба показания одометра.')
  else {
    if (odoStart < 0 || odoEnd < 0) errors.push('Одометр не может быть отрицательным.')
    if (odoEnd < odoStart) errors.push('Конечный одометр меньше начального.')
  }

  if (hasMotohours) {
    const mhStart = num(trip?.motohoursStart)
    const mhEnd = num(trip?.motohoursEnd)
    const legacyWorked = num(trip?.motohours)
    const hasAnyCounter = mhStart !== null || mhEnd !== null
    if (!trip?.unused && !hasMotohourCounterPair(trip) && legacyWorked === null) errors.push('Не заполнены оба показания моточасов.')
    if (hasAnyCounter && (mhStart === null || mhEnd === null)) errors.push('Заполните оба показания моточасов: до и после.')
    if (mhStart !== null && mhStart < 0 || mhEnd !== null && mhEnd < 0 || legacyWorked !== null && legacyWorked < 0) errors.push('Моточасы не могут быть отрицательными.')
    if (mhStart !== null && mhEnd !== null && mhEnd < mhStart) errors.push('Конечные моточасы меньше начальных.')
    const worked = motohoursWorked(trip)
    if (worked !== null && worked < 0 && !errors.includes('Конечные моточасы меньше начальных.')) errors.push('Отработанные моточасы не могут быть отрицательными.')
  }

  const materials = Object.keys(trip?.gsm || {})
  if (!trip?.unused && !materials.length) errors.push('Не добавлен ни один тип ГСМ / масла.')
  for (const material of materials) {
    const q = trip.gsm[material] || {}
    const values = ['start', 'received', 'spent', 'end'].map(key => num(q[key]))
    if (values.some(value => value === null)) errors.push(`${materialLabel(material)} — заполнены не все четыре значения.`)
    else if (values.some(value => value < 0)) errors.push(`${materialLabel(material)} — отрицательное значение.`)
  }
  return errors
}
