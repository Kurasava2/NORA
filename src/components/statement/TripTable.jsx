import React from 'react'
import {
  fmtDate,
  kmfmt,
  materialCellName,
  motohoursWorked,
  nfmt,
  nonZero,
  num,
  tripMaterialNames,
  validateStatement,
} from '../../lib/domain.js'
import { Badge, Button, Empty, classNames } from '../ui.jsx'

function materialSummary(state, trip) {
  return tripMaterialNames(trip)
    .map(materialName => {
      const materialValues = trip.gsm?.[materialName] || {}
      const spent = num(materialValues.spent)
      const end = num(materialValues.end)
      const parts = []

      if (spent !== null && nonZero(state, spent)) parts.push(`−${nfmt(spent)}`)
      if (end !== null && nonZero(state, end)) parts.push(`ост. ${nfmt(end)}`)
      if (!parts.length) return null

      return (
        <span key={materialName}>
          <b>{materialCellName(materialName)}</b> {parts.join(' / ')}
        </span>
      )
    })
    .filter(Boolean)
}

function TripRow({ state, vehicle, trip, allErrors, onEdit, onDelete }) {
  const errorPrefix = `Путёвка №${trip.number || '?'} (${fmtDate(trip.date)})`
  const tripErrors = allErrors.filter(errorMessage => errorMessage.startsWith(errorPrefix))
  const odometerStart = num(trip.odoStart)
  const odometerEnd = num(trip.odoEnd)
  const motohoursStart = num(trip.motohoursStart)
  const motohoursEnd = num(trip.motohoursEnd)
  const workedMotohours = motohoursWorked(trip)

  return (
    <tr
      className={classNames(
        'clickable hover-row',
        tripErrors.length && 'row-bad',
        trip.unused && 'row-unused',
      )}
      onClick={() => onEdit(trip)}
    >
      <td><b>{fmtDate(trip.date)}</b></td>
      <td><b>{trip.number}</b>{trip.unused && <Badge>неисп.</Badge>}</td>
      <td className="num">{kmfmt(trip.odoStart)}</td>
      <td className="num">{kmfmt(trip.odoEnd)}</td>
      <td className="num">
        <b>{odometerStart !== null && odometerEnd !== null ? kmfmt(odometerEnd - odometerStart) : '—'}</b>
      </td>
      {vehicle.hasMotohours && (
        <>
          <td className="num">{motohoursStart === null ? '—' : nfmt(motohoursStart)}</td>
          <td className="num">{motohoursEnd === null ? '—' : nfmt(motohoursEnd)}</td>
          <td className="num"><b>{workedMotohours === null ? '—' : nfmt(workedMotohours)}</b></td>
        </>
      )}
      <td><div className="trip-gsm">{materialSummary(state, trip)}</div></td>
      <td>{trip.note || '—'}</td>
      <td className="actions-cell">
        <div className="row-actions">
          {tripErrors.length ? <Badge tone="bad">{tripErrors.length}</Badge> : <Badge tone="ok">✓</Badge>}
          <Button
            small
            danger
            icon
            title="Удалить путёвку"
            aria-label="Удалить путёвку"
            onClick={clickEvent => {
              clickEvent.stopPropagation()
              onDelete(trip)
            }}
          >
            ×
          </Button>
        </div>
      </td>
    </tr>
  )
}

export default function TripTable({ state, period, statement, vehicle, onEdit, onDelete }) {
  if (!statement.trips.length) {
    return (
      <Empty
        compact
        title="Машина не выезжала"
        text="Путёвок нет — ведомость считается обработанной как машина без выезда."
      />
    )
  }

  const allErrors = validateStatement(state, statement, period).errors

  return (
    <div className="table-wrap">
      <table className="data-table trips-table">
        <thead>
          <tr>
            <th>Дата</th><th>№</th><th>Одометр до</th><th>После</th><th>Км</th>
            {vehicle.hasMotohours && <><th>М/ч до</th><th>После</th><th>М/ч</th></>}
            <th>ГСМ: расход / остаток</th><th>Примечание</th><th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {statement.trips.map(trip => (
            <TripRow
              key={trip.id}
              state={state}
              vehicle={vehicle}
              trip={trip}
              allErrors={allErrors}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
