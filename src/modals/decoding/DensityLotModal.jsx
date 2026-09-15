import React, { useEffect, useState } from 'react'
import { Button, Field, Modal } from '../../components/ui.jsx'
import { decimalCompare, decimalCanonical } from '../../lib/decodings/decimal.js'

const EMPTY_FORM = {
  density: '',
  volume: '',
  date: '',
  sourceType: 'receipt',
  note: '',
}

export default function DensityLotModal({ open, onClose, period, materialName, onSave, notify }) {
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (!open) return
    setForm({ ...EMPTY_FORM, date: period?.start || '' })
  }, [open, period])

  const submit = submitEvent => {
    submitEvent.preventDefault()
    const density = decimalCanonical(form.density)
    const volume = decimalCanonical(form.volume)
    if (!density || decimalCompare(density, '0') !== 1) {
      notify('Укажите положительную плотность партии.', true)
      return
    }
    if (!volume || decimalCompare(volume, '0') !== 1) {
      notify('Укажите положительный объём партии.', true)
      return
    }
    if (!form.date) {
      notify('Укажите дату партии.', true)
      return
    }
    onSave({ ...form, density, volume })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Новая партия · ${materialName}`}
      subtitle="Плотность задаётся партии, а не всему виду ГСМ."
      wide
    >
      <form onSubmit={submit}>
        <div className="modal-body grid-2">
          <Field label="Плотность ρ">
            <input
              className="input"
              value={form.density}
              onChange={event => setForm(previous => ({ ...previous, density: event.target.value }))}
              placeholder="0,827"
            />
          </Field>
          <Field label="Объём, л">
            <input
              className="input"
              value={form.volume}
              onChange={event => setForm(previous => ({ ...previous, volume: event.target.value }))}
              placeholder="7500"
            />
          </Field>
          <Field label="Дата">
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={event => setForm(previous => ({ ...previous, date: event.target.value }))}
            />
          </Field>
          <Field label="Источник">
            <select
              className="select"
              value={form.sourceType}
              onChange={event => setForm(previous => ({ ...previous, sourceType: event.target.value }))}
            >
              <option value="receipt">Поступление</option>
              <option value="opening">Начальный остаток</option>
              <option value="manual-adjustment">Ручная корректировка</option>
            </select>
          </Field>
          <Field label="Примечание">
            <input
              className="input"
              value={form.note}
              onChange={event => setForm(previous => ({ ...previous, note: event.target.value }))}
            />
          </Field>
        </div>
        <div className="modal-actions">
          <Button type="button" onClick={onClose}>Отмена</Button>
          <Button primary type="submit">Добавить партию</Button>
        </div>
      </form>
    </Modal>
  )
}
