import React from 'react'
import { DateControl, Field, classNames } from '../../components/ui.jsx'
import { nfmt } from '../../lib/domain.js'
import SectionStep from './SectionStep.jsx'

const liveValueClasses =
  'flex min-h-[44px] items-baseline justify-center gap-1.5 rounded-[9px] border border-slate-700 bg-[#0b1220] px-[11px] py-[9px]'

function LiveCounterValue({ value, unit, invalid = false }) {
  return (
    <div className={classNames(liveValueClasses, invalid && 'border-red-500')}>
      <b className="text-lg leading-[1.1] text-gray-100">{value}</b>
      <small className="text-[11px] text-slate-400">{unit}</small>
    </div>
  )
}

export default function TripBasicsSections({
  form,
  setForm,
  setTripField,
  period,
  vehicle,
  mileage,
  motohoursWorked,
  legacyMotohours,
}) {
  return (
    <>
      <SectionStep number="1" title="Путевой лист" subtitle="дата, номер и статус">
        <div className="grid-3">
          <Field label="Дата">
            <DateControl
              large
              value={form.date || ''}
              min={period.start}
              max={period.end}
              onChange={value => setTripField('date', value)}
            />
          </Field>
          <Field label="Номер путёвки">
            <input
              className="input input-lg"
              value={form.number || ''}
              onChange={event => setTripField('number', event.target.value)}
              autoFocus
            />
          </Field>
          <label className="check-card">
            <input
              type="checkbox"
              checked={Boolean(form.unused)}
              onChange={event =>
                setForm(previousForm => ({
                  ...previousForm,
                  unused: event.target.checked,
                  note:
                    event.target.checked && !previousForm.note
                      ? 'неиспользованный'
                      : previousForm.note,
                }))
              }
            />
            <span>
              <b>Неиспользованная</b>
              <small>Нули автоматически не подставляются</small>
            </span>
          </label>
        </div>
      </SectionStep>

      <SectionStep number="2" title="Одометр" subtitle="показания без разделителей тысяч">
        <div className="odo-grid">
          <Field label="Перед выездом">
            <input
              className="input input-number-xl"
              inputMode="decimal"
              value={form.odoStart ?? ''}
              onChange={event => setTripField('odoStart', event.target.value)}
            />
          </Field>
          <Field label="После выезда">
            <input
              className="input input-number-xl"
              inputMode="decimal"
              value={form.odoEnd ?? ''}
              onChange={event => setTripField('odoEnd', event.target.value)}
            />
          </Field>
          <Field className="[&_.field-label]:mb-1.5" label="Пройдено">
            <LiveCounterValue
              value={
                mileage === null
                  ? '—'
                  : String(Math.round(mileage * 100) / 100).replace('.', ',')
              }
              unit="км"
              invalid={mileage !== null && mileage < 0}
            />
          </Field>
        </div>

        {vehicle.hasMotohours && (
          <>
            <div className="odo-grid motohours-grid">
              <Field label="Моточасы до">
                <input
                  className="input input-number-xl"
                  inputMode="decimal"
                  value={form.motohoursStart ?? ''}
                  onChange={event => setTripField('motohoursStart', event.target.value)}
                />
              </Field>
              <Field label="Моточасы после">
                <input
                  className="input input-number-xl"
                  inputMode="decimal"
                  value={form.motohoursEnd ?? ''}
                  onChange={event => setTripField('motohoursEnd', event.target.value)}
                />
              </Field>
              <Field className="[&_.field-label]:mb-1.5" label="Отработано">
                <LiveCounterValue
                  value={motohoursWorked === null ? '—' : nfmt(motohoursWorked)}
                  unit="м/ч"
                  invalid={motohoursWorked !== null && motohoursWorked < 0}
                />
              </Field>
            </div>
            {legacyMotohours && (
              <div className="notice">
                Старая запись: сохранено только «отработано {nfmt(form.motohours)} м/ч». Можно
                оставить её как есть или заполнить показания до/после.
              </div>
            )}
          </>
        )}
      </SectionStep>
    </>
  )
}
