import React from 'react'
import Button from './Button.jsx'
import { classNames } from './classNames.js'

function isoDateFromLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

export default function DateControl({ value, onChange, min, max, large = false }) {
  const shiftDate = dayDelta => {
    if (!value) return value

    const shiftedDate = new Date(`${value}T12:00:00`)
    shiftedDate.setDate(shiftedDate.getDate() + dayDelta)

    let nextValue = isoDateFromLocalDate(shiftedDate)
    if (min && nextValue < min) nextValue = min
    if (max && nextValue > max) nextValue = max
    return nextValue
  }

  return (
    <div className={classNames('date-control', large && 'date-control-lg')}>
      <Button type="button" icon small onClick={() => onChange(shiftDate(-1))} title="Предыдущий день">
        ‹
      </Button>
      <div className="date-core">
        <input
          className={classNames('input', large && 'input-lg')}
          type="date"
          value={value || ''}
          min={min}
          max={max}
          onChange={event => onChange(event.target.value)}
        />
      </div>
      <Button type="button" icon small onClick={() => onChange(shiftDate(1))} title="Следующий день">
        ›
      </Button>
    </div>
  )
}
