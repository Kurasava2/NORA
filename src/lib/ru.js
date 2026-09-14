export function pluralRu(value, one, few, many) {
  const n = Math.abs(Number(value) || 0)
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

export function countRu(value, one, few, many) {
  return `${value} ${pluralRu(value, one, few, many)}`
}

export const RU_FORMS = {
  month: ['месяц', 'месяца', 'месяцев'],
  vehicle: ['машина', 'машины', 'машин'],
  trip: ['путёвка', 'путёвки', 'путёвок'],
  error: ['ошибка', 'ошибки', 'ошибок'],
  warning: ['замечание', 'замечания', 'замечаний'],
  period: ['период', 'периода', 'периодов'],
  sheet: ['лист', 'листа', 'листов'],
  statement: ['ведомость', 'ведомости', 'ведомостей'],
  type: ['тип', 'типа', 'типов'],
  kind: ['вид', 'вида', 'видов'],
  machineMonth: ['машино-месяц', 'машино-месяца', 'машино-месяцев']
}

export function countForm(value, forms) {
  return countRu(value, forms[0], forms[1], forms[2])
}
