import React, { useEffect, useMemo, useState } from 'react'
import { Button, Field, Modal } from '../../components/ui.jsx'
import { decimalCanonical, decimalCompare } from '../../lib/decodings/decimal.js'
import {
  DENSITY_ENTRY_OPENING,
  DENSITY_ENTRY_RECEIPT,
} from '../../lib/decodings/model.js'

const EMPTY_FORM = {
  vehicleId: '',
  tripId: '',
  date: '',
  waybillNumber: '',
  density: '',
  liters: '',
  note: '',
}

function titleFor(kind) {
  return kind === DENSITY_ENTRY_OPENING ? 'Начальный остаток по плотности' : 'Выдача по раздаточной'
}

export default function DensityEntryModal({
  open,
  onClose,
  period,
  document,
  materialName,
  kind = DENSITY_ENTRY_RECEIPT,
  onSave,
  notify,
}) {
  const rows = useMemo(
    () => (document?.sourceSnapshot?.rows || []).filter(row => row.materialName === materialName),
    [document, materialName],
  )
  const [form, setForm] = useState(EMPTY_FORM)
  const row = rows.find(candidate => candidate.vehicleId === form.vehicleId) || null
  const trips = (row?.trips || []).filter(sourceTrip => Number(sourceTrip.received || 0) > 0)
  const trip = trips.find(candidate => candidate.tripId === form.tripId) || null

  useEffect(() => {
    if (!open) return
    const vehicleId = rows[0]?.vehicleId || ''
    setForm({ ...EMPTY_FORM, vehicleId, date: period?.start || '' })
  }, [open, period, rows])

  const updateVehicle = vehicleId => {
    setForm(previous => ({
      ...previous,
      vehicleId,
      tripId: '',
      date: period?.start || '',
      waybillNumber: '',
    }))
  }

  const updateTrip = tripId => {
    const sourceRow = rows.find(candidate => candidate.vehicleId === form.vehicleId)
    const selectedTrip = sourceRow?.trips?.find(candidate => candidate.tripId === tripId)
    setForm(previous => ({
      ...previous,
      tripId,
      date: selectedTrip?.date || previous.date,
      waybillNumber: selectedTrip?.number || '',
    }))
  }

  const submit = submitEvent => {
    submitEvent.preventDefault()
    const density = decimalCanonical(form.density)
    const liters = decimalCanonical(form.liters)
    if (!form.vehicleId) return notify('Выберите машину.', true)
    if (kind === DENSITY_ENTRY_RECEIPT && !form.tripId) {
      return notify('Выберите путёвку из раздаточной ведомости.', true)
    }
    if (!density || decimalCompare(density, '0') !== 1) {
      return notify('Укажите положительную плотность.', true)
    }
    if (!liters || decimalCompare(liters, '0') !== 1) {
      return notify('Укажите положительный объём.', true)
    }
    onSave({
      ...form,
      density,
      liters,
      statementId: row?.statementId || '',
      waybillNumber: trip?.number || form.waybillNumber,
      date: trip?.date || form.date || period?.start,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${titleFor(kind)} · ${materialName}`}
      subtitle={kind === DENSITY_ENTRY_OPENING
        ? 'Нужно только когда нет предыдущей расшифровки с известной плотностью.'
        : 'Данные берутся из бумажной раздаточной ведомости заправки.'}
      wide
    >
      <form onSubmit={submit}>
        <div className="modal-body grid-2">
          <Field label="Машина">
            <select className="select" value={form.vehicleId} onChange={event => updateVehicle(event.target.value)}>
              {rows.map(sourceRow => (
                <option key={sourceRow.statementId} value={sourceRow.vehicleId}>
                  {sourceRow.vehicleShortNo} · {sourceRow.vehicleModel}
                </option>
              ))}
            </select>
          </Field>
          {kind === DENSITY_ENTRY_RECEIPT && (
            <Field label="Путёвка">
              <select className="select" value={form.tripId} onChange={event => updateTrip(event.target.value)}>
                <option value="">Выберите путёвку</option>
                {trips.map(sourceTrip => (
                  <option key={sourceTrip.tripId} value={sourceTrip.tripId}>
                    №{sourceTrip.number || '—'} · {sourceTrip.date} · получено {sourceTrip.received || 0} л
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Плотность ρ">
            <input
              className="input"
              value={form.density}
              onChange={event => setForm(previous => ({ ...previous, density: event.target.value }))}
              placeholder="0,827"
            />
          </Field>
          <Field label="Литры">
            <input
              className="input num-input"
              value={form.liters}
              onChange={event => setForm(previous => ({ ...previous, liters: event.target.value }))}
              placeholder="930"
            />
          </Field>
          <Field label="Дата">
            <input
              className="input"
              type="date"
              value={trip?.date || form.date}
              disabled={Boolean(trip)}
              onChange={event => setForm(previous => ({ ...previous, date: event.target.value }))}
            />
          </Field>
          <Field label="Примечание">
            <input className="input" value={form.note} onChange={event => setForm(previous => ({ ...previous, note: event.target.value }))} />
          </Field>
        </div>
        <div className="modal-actions">
          <Button type="button" onClick={onClose}>Отмена</Button>
          <Button primary type="submit">Добавить</Button>
        </div>
      </form>
    </Modal>
  )
}
