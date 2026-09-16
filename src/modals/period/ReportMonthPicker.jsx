import React, { useEffect, useState } from 'react'

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

function validYear(value, fallback) {
  const numericYear = Number(value)
  if (!Number.isFinite(numericYear)) return fallback
  return Math.min(9999, Math.max(1900, Math.trunc(numericYear)))
}

export default function ReportMonthPicker({ value, onChange }) {
  const parsed = parseMonth(value)
  const [yearText, setYearText] = useState(String(parsed.year))

  useEffect(() => setYearText(String(parsed.year)), [parsed.year])

  const commitYear = () => {
    const nextYear = validYear(yearText, parsed.year)
    setYearText(String(nextYear))
    if (nextYear !== parsed.year) onChange(monthValue(nextYear, parsed.month))
  }

  const setMonth = month => {
    const nextYear = validYear(yearText, parsed.year)
    setYearText(String(nextYear))
    onChange(monthValue(nextYear, Number(month)))
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
        type="text"
        inputMode="numeric"
        value={yearText}
        onChange={event => setYearText(event.target.value.replace(/\D/g, '').slice(0, 4))}
        onBlur={commitYear}
        onKeyDown={event => {
          if (event.key === 'Enter') commitYear()
        }}
        aria-label="Год"
      />
    </div>
  )
}
