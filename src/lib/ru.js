export function pluralRu(value, one, few, many) {
  const n = Math.abs(Number(value) || 0)
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  const mod10 = n % 10
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

export function countRu(value, one, few, many) {
  return `${value} ${pluralRu(value, one, few, many)}`
}
