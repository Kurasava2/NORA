import React from 'react'
import { DateControl, Field, classNames } from '../../components/ui.jsx'
import { nfmt } from '../../lib/domain.js'
import SectionStep from './SectionStep.jsx'

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
          <Field className="trip-km-field" label="Пройдено">
            <div className={classNames('km-live km-live-value', mileage !== null && mileage < 0 && 'bad')}>
              <b>{mileage === null ? '—' : String(Math.round(mileage * 100) / 100).replace('.', ',')}</b>
              <small>км</small>
            </div>
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
              <Field className="trip-km-field" label="Отработано">
                <div
                  className={classNames(
                    'km-live km-live-value',
                    motohoursWorked !== null && motohoursWorked < 0 && 'bad',
                  )}
                >
                  <b>{motohoursWorked === null ? '—' : nfmt(motohoursWorked)}</b>
                  <small>м/ч</small>
                </div>
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
