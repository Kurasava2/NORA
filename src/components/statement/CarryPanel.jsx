import React from 'react'
import { kmfmt, materialDisplayName, nfmt } from '../../lib/domain.js'
import { Button, Card } from '../ui.jsx'

export default function CarryPanel({ statement, onRefresh }) {
  const opening = statement.opening

  return (
    <Card className="side-card">
      <div className="side-card-head">
        <h3>Перенос</h3>
        <Button small onClick={onRefresh}>Обновить</Button>
      </div>
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
