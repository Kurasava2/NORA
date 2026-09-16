import React, { useEffect, useMemo, useState } from 'react'
import { Button, DateControl, Field, Modal } from '../components/ui.jsx'
import ReportMonthPicker from './period/ReportMonthPicker.jsx'
import { fmtDate, periodDisplayName, presetDates, uid } from '../lib/domain.js'

function currentMonthValue() {
  const currentDate = new Date()
  const month = String(currentDate.getMonth() + 1).padStart(2, '0')
  return `${currentDate.getFullYear()}-${month}`
}

export default function PeriodModal({ open, onClose, state, mutate, onCreated, notify }) {
  const currentMonth = useMemo(currentMonthValue, [])
  const [month, setMonth] = useState(currentMonth)
  const [preset, setPreset] = useState('21')
  const [dates, setDates] = useState(() => presetDates(currentMonth, '21'))

  useEffect(() => {
    if (!open) return
    setMonth(currentMonth)
    setPreset('21')
    setDates(presetDates(currentMonth, '21'))
  }, [open, currentMonth])

  const changePreset = (nextMonth, nextPreset) => {
    setMonth(nextMonth)
    setPreset(nextPreset)
    if (nextPreset !== 'manual') setDates(presetDates(nextMonth, nextPreset))
  }

  const submit = submitEvent => {
    submitEvent.preventDefault()
    if (!dates.start || !dates.end || dates.start > dates.end) {
      notify('Проверьте даты периода.', true)
      return
    }

    const duplicateExists = state.periods.some(
      period => period.start === dates.start && period.end === dates.end,
    )
    if (duplicateExists) {
      notify('Такой период уже существует.', true)
      return
    }

    const newPeriod = {
      id: uid(),
      reportMonth: month,
      start: dates.start,
      end: dates.end,
      statements: [],
    }
    mutate(nextState => nextState.periods.push(newPeriod))
    onCreated(newPeriod)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новый расчётный период"
      subtitle="Месяц станет именем периода, а даты останутся отдельным диапазоном."
    >
      <form onSubmit={submit}>
        <div className="modal-body grid-2">
          <Field label="Отчётный месяц">
            <ReportMonthPicker
              value={month}
              onChange={nextMonth => changePreset(nextMonth, preset)}
            />
          </Field>
          <Field label="Схема периода">
            <select
              className="select"
              value={preset}
              onChange={changeEvent => changePreset(month, changeEvent.target.value)}
            >
              <option value="21">21 предыдущего → 20 текущего</option>
              <option value="26">26 предыдущего → 25 текущего</option>
              <option value="calendar">Календарный месяц</option>
              <option value="manual">Произвольные даты</option>
            </select>
          </Field>
          <Field label="Начало">
            <DateControl
              value={dates.start}
              onChange={nextStart => setDates(previousDates => ({ ...previousDates, start: nextStart }))}
            />
          </Field>
          <Field label="Окончание">
            <DateControl
              value={dates.end}
              onChange={nextEnd => setDates(previousDates => ({ ...previousDates, end: nextEnd }))}
            />
          </Field>
        </div>
        <div className="period-preview">
          <span>Будет создано</span>
          <b>{periodDisplayName({ reportMonth: month, start: dates.start, end: dates.end })}</b>
          <small>{fmtDate(dates.start)} — {fmtDate(dates.end)}</small>
        </div>
        <div className="notice">
          Для машины с путёвками программа найдёт предыдущую заполненную ведомость и перенесёт
          одометр и остатки ГСМ. Машины без путёвок автоматически считаются не выезжавшими.
        </div>
        <div className="modal-actions">
          <Button type="button" onClick={onClose}>Отмена</Button>
          <Button primary type="submit">Создать период</Button>
        </div>
      </form>
    </Modal>
  )
}
