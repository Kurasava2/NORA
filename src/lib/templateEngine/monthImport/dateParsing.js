const RU_MONTHS = {
  января: 1,
  февраля: 2,
  марта: 3,
  апреля: 4,
  мая: 5,
  июня: 6,
  июля: 7,
  августа: 8,
  сентября: 9,
  октября: 10,
  ноября: 11,
  декабря: 12,
}

export function excelSerialIso(value) {
  const serialNumber = Number(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(serialNumber) || serialNumber < 1) return ''

  const date = new Date(
    Date.UTC(1899, 11, 30) + Math.floor(serialNumber) * 86400000,
  )
  return date.toISOString().slice(0, 10)
}

export function workbookDate(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  if (/^\d+(?:\.\d+)?$/.test(text)) return excelSerialIso(text)

  let dateMatch = text.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/)
  if (dateMatch) {
    return `${dateMatch[3]}-${String(dateMatch[2]).padStart(2, '0')}-${String(
      dateMatch[1],
    ).padStart(2, '0')}`
  }

  dateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : ''
}

export function isoRuDate(day, monthName, year) {
  const monthNumber = RU_MONTHS[String(monthName || '').toLowerCase()]
  if (!monthNumber) return ''

  return `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(
    2,
    '0',
  )}`
}

export function periodFromTitle(title) {
  const normalizedTitle = String(title || '').replace(/\s+/g, ' ')
  const periodMatch = normalizedTitle.match(
    /за\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})\s*(?:года?|г\.?)?\s*[-–—]\s*(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i,
  )
  if (!periodMatch) return null

  const start = isoRuDate(periodMatch[1], periodMatch[2], periodMatch[3])
  const end = isoRuDate(periodMatch[4], periodMatch[5], periodMatch[6])
  return start && end
    ? {
        start,
        end,
        reportMonth: end.slice(0, 7),
      }
    : null
}
