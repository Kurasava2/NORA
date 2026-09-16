import React from 'react'
import { kmfmt, materialDisplayName, nfmt } from '../../lib/domain.js'
import { Button, Card } from '../ui.jsx'

function AutoCarryToggle({ enabled, onChange }) {
  return (
    <label
      className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-300"
      title="После сохранения изменений автоматически обновлять перенос в следующих месяцах этой машины"
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={enabled}
        onChange={event => onChange(event.target.checked)}
      />
      <span
        className={
          'relative h-5 w-9 rounded-full bg-slate-700 transition-colors ' +
          'after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 ' +
          'after:rounded-full after:bg-white after:transition-transform ' +
          'peer-checked:bg-emerald-600 peer-checked:after:translate-x-4'
        }
      />
      <span>Авто</span>
    </label>
  )
}

export default function CarryPanel({ statement, autoCarry, onAutoCarryChange, onRefresh }) {
  const opening = statement.opening

  return (
    <Card className="side-card">
      <div className="side-card-head">
        <h3>Перенос</h3>
        <div className="flex items-center gap-2">
          <AutoCarryToggle enabled={autoCarry} onChange={onAutoCarryChange} />
          <Button small onClick={onRefresh}>Обновить</Button>
        </div>
      </div>
      {autoCarry && (
        <p className="mb-2 text-[11px] leading-4 text-emerald-400">
          Обновляется после сохранения изменений и только пока перенос реально меняется.
        </p>
      )}
      {opening ? (
        <>
          <p className="muted">Из периода {opening.sourceLabel}</p>
          <div className="carry-value"><span>Одометр</span><b>{kmfmt(opening.odo)}</b></div>
          {opening.motohours != null && (
            <div className="carry-value"><span>Моточасы</span><b>{nfmt(opening.motohours)}</b></div>
          )}
          {Object.entries(opening.gsm || {}).map(([materialName, balance]) => (
            <div className="carry-value" key={materialName}>
              <span>{materialDisplayName(materialName)}</span><b>{nfmt(balance)} л</b>
            </div>
          ))}
          {opening.sourceHasErrors && (
            <div className="mini-warning">В исходной ведомости есть ошибки.</div>
          )}
        </>
      ) : (
        <p className="muted">Предыдущая заполненная ведомость этой машины не найдена.</p>
      )}
    </Card>
  )
}
