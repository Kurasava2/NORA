import { num } from './numbers.js'

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
    const motohours = num(trip?.motohours)
    if (motohours === null) errors.push('Не заполнены моточасы.')
    else if (motohours < 0) errors.push('Моточасы не могут быть отрицательными.')
  }

  const materials = Object.keys(trip?.gsm || {})
  if (!materials.length) errors.push('Не добавлен ни один тип ГСМ / масла.')
  for (const material of materials) {
    const q = trip.gsm[material] || {}
    const values = ['start', 'received', 'spent', 'end'].map(key => num(q[key]))
    if (values.some(value => value === null)) errors.push(`${materialLabel(material)} — заполнены не все четыре значения.`)
    else if (values.some(value => value < 0)) errors.push(`${materialLabel(material)} — отрицательное значение.`)
  }
  return errors
}
