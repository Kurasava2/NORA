import React from 'react'

const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

function parseMonth(value) {
  const [yearText, monthText] = String(value || '').split('-')
  return {
    year: Number(yearText) || new Date().getFullYear(),
    month: Math.min(12, Math.max(1, Number(monthText) || 1)),
  }
}

function monthValue(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export default function ReportMonthPicker({ value, onChange }) {
  const parsed = parseMonth(value)
  const setMonth = month => onChange(monthValue(parsed.year, Number(month)))
  const setYear = year => {
    const numericYear = Math.min(9999, Math.max(1900, Number(year) || parsed.year))
    onChange(monthValue(numericYear, parsed.month))
  }

  return (
    <div className="report-month-picker">
      <select className="select" value={parsed.month} onChange={event => setMonth(event.target.value)}>
        {MONTHS.map((monthName, monthIndex) => (
          <option key={monthName} value={monthIndex + 1}>{monthName}</option>
        ))}
      </select>
      <input
        className="input report-year-input"
        type="number"
        min="1900"
        max="9999"
        inputMode="numeric"
        value={parsed.year}
        onChange={event => setYear(event.target.value)}
        aria-label="Год"
      />
    </div>
  )
}
