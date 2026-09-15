import { num } from '../numbers.js'

const NUMBER_FORMATTER = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2,
})

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const MONTH_NAMES = Array.from({ length: 12 }, (_, monthIndex) => {
  const monthName = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(
    new Date(2020, monthIndex, 1),
  )
  return monthName[0].toUpperCase() + monthName.slice(1)
})

export function nfmt(value) {
  const numericValue = num(value)
  if (numericValue === null) return '—'
  return NUMBER_FORMATTER.format(numericValue)
}

export function kmfmt(value) {
  const numericValue = num(value)
  if (numericValue === null) return '—'
  return String(Math.round(numericValue * 100) / 100).replace('.', ',')
}

export function fmtDate(value) {
  if (!value) return '—'
  const [year, month, day] = String(value).split('-')
  return `${day}.${month}.${year}`
}

export function longDate(value) {
  if (!value) return ''
  return LONG_DATE_FORMATTER.format(new Date(`${value}T12:00:00`)).replace(
    /\s+г\.$/u,
    ' г',
  )
}

export const periodName = period => `${fmtDate(period.start)} — ${fmtDate(period.end)}`

export const reportMonthOf = period =>
  period?.reportMonth || String(period?.end || period?.start || '').slice(0, 7)

export function periodMonthName(period) {
  const reportMonth = reportMonthOf(period)
  if (!/^\d{4}-\d{2}$/.test(reportMonth)) return 'Без месяца'

  const monthNumber = Number(reportMonth.slice(5, 7))
  return MONTH_NAMES[monthNumber - 1] || 'Без месяца'
}

export const periodYear = period => Number(reportMonthOf(period).slice(0, 4)) || 0

export const periodDisplayName = period =>
  `${periodMonthName(period)} ${periodYear(period)}`.trim()

export const safeFile = fileName =>
  String(fileName)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()

export function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

export function presetDates(month, preset) {
  const [year, monthNumber] = month.split('-').map(Number)
  if (!year || !monthNumber) return { start: '', end: '' }

  if (preset === 'calendar') {
    return {
      start: isoDate(new Date(year, monthNumber - 1, 1)),
      end: isoDate(new Date(year, monthNumber, 0)),
    }
  }

  const startDay = Number(preset || 21)
  return {
    start: isoDate(new Date(year, monthNumber - 2, startDay)),
    end: isoDate(new Date(year, monthNumber - 1, startDay === 21 ? 20 : 25)),
  }
}

export const sortedPeriods = state =>
  [...state.periods].sort(
    (firstPeriod, secondPeriod) =>
      reportMonthOf(secondPeriod).localeCompare(reportMonthOf(firstPeriod)) ||
      secondPeriod.start.localeCompare(firstPeriod.start),
  )
