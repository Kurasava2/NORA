import React, { useEffect, useMemo, useState } from 'react'
import { Button, Field, Modal } from '../../components/ui.jsx'
import { decimalCanonical, decimalCompare } from '../../lib/decodings/decimal.js'
import {
  MOVEMENT_OPENING,
  MOVEMENT_RECEIPT,
  MOVEMENT_SURRENDERED,
} from '../../lib/decodings/model.js'

const EMPTY_FORM = {
  vehicleId: '', density: '', liters: '', date: '', waybillNumber: '',
  kind: MOVEMENT_RECEIPT, note: '',
}

function movementForm(movement, vehicleRows, period, defaultKind) {
  if (!movement) {
    return {
      ...EMPTY_FORM,
      vehicleId: vehicleRows[0]?.vehicleId || '',
      date: period?.start || '',
      kind: defaultKind || MOVEMENT_RECEIPT,
    }
  }
  return {
    vehicleId: movement.vehicleId || '',
    density: String(movement.density || '').replace('.', ','),
    liters: movement.liters || '',
    date: movement.date || period?.start || '',
    waybillNumber: movement.waybillNumber || '',
    kind: movement.kind || MOVEMENT_RECEIPT,
    note: movement.note || '',
  }
}

export default function DensityMovementModal({
  open, onClose, period, materialName, sourceRows, defaultKind,
  movement, onSave, notify,
}) {
  const vehicleRows = useMemo(() => sourceRows || [], [sourceRows])
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (open) setForm(movementForm(movement, vehicleRows, period, defaultKind))
  }, [open, movement, period, defaultKind, vehicleRows])

  const update = (fieldName, value) => {
    setForm(previousForm => ({ ...previousForm, [fieldName]: value }))
  }

  const submit = submitEvent => {
    submitEvent.preventDefault()
    const density = decimalCanonical(form.density)
    const liters = decimalCanonical(form.liters)
    if (!form.vehicleId) return notify('Выберите автомобиль.', true)
    if (!density || decimalCompare(density, '0') !== 1) {
      return notify('Укажите положительную плотность.', true)
    }
    if (!liters || decimalCompare(liters, '0') !== 1) {
      return notify('Укажите положительный объём.', true)
    }
    if (!form.date) return notify('Укажите дату.', true)
    if (form.date < period.start || form.date > period.end) {
      return notify('Дата должна находиться внутри расчётного периода.', true)
    }
    if (form.kind === MOVEMENT_RECEIPT && !form.waybillNumber.trim()) {
      return notify('Для выдачи укажите номер путёвки из раздаточной ведомости.', true)
    }
    onSave({ ...form, density, liters })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${movement ? 'Изменить' : 'Новая'} запись · ${materialName}`}
      subtitle="Данные вручную переносятся из раздаточной ведомости заправки."
      wide
    >
      <form onSubmit={submit}>
        <div className="modal-body grid-2">
          <Field label="Автомобиль">
            <select className="select" value={form.vehicleId} onChange={event => update('vehicleId', event.target.value)}>
              {vehicleRows.map(row => (
                <option key={row.vehicleId} value={row.vehicleId}>
                  {row.vehicleShortNo} · {row.vehicleModel} · {row.vehicleReg}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Тип записи">
            <select className="select" value={form.kind} onChange={event => update('kind', event.target.value)}>
              <option value={MOVEMENT_RECEIPT}>Получено по раздаточной</option>
              <option value={MOVEMENT_SURRENDERED}>Сдано / слито</option>
              <option value={MOVEMENT_OPENING}>Начальный остаток вручную</option>
            </select>
          </Field>
          <Field label="Плотность ρ">
            <input className="input" value={form.density} onChange={event => update('density', event.target.value)} placeholder="0,827" />
          </Field>
          <Field label="Объём, л">
            <input className="input" value={form.liters} onChange={event => update('liters', event.target.value)} placeholder="500" />
          </Field>
          <Field label="Дата">
            <input className="input" type="date" value={form.date} onChange={event => update('date', event.target.value)} />
          </Field>
          <Field label="№ путёвки">
            <input className="input" value={form.waybillNumber} onChange={event => update('waybillNumber', event.target.value)} placeholder="315" />
          </Field>
          <Field label="Примечание">
            <input className="input" value={form.note} onChange={event => update('note', event.target.value)} />
          </Field>
        </div>
        <div className="modal-actions">
          <Button type="button" onClick={onClose}>Отмена</Button>
          <Button primary type="submit">{movement ? 'Сохранить изменения' : 'Добавить запись'}</Button>
        </div>
      </form>
    </Modal>
  )
}
