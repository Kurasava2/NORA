import React from 'react'
import { Badge, Button, Card } from '../../components/ui.jsx'
import { nfmt } from '../../lib/domain.js'
import { distributedLiters } from '../../lib/decodings/allocations.js'
import { materialSourceRows } from '../../lib/decodings/selectors.js'

function workValue(row) {
  if (row.motohoursEnd !== null) return `${nfmt(row.motohoursEnd)} м/ч`
  return row.odometerEnd === null ? '—' : `${nfmt(row.odometerEnd)} км`
}

export default function DecodingSourceTable({ decodingState, document, materialName, onEdit }) {
  const rows = materialSourceRows(document, materialName)

  return (
    <Card>
      <div className="section-heading">
        <div>
          <h3>Автомобили · {materialName}</h3>
          <p>Серые значения получены из ведомостей и здесь не редактируются.</p>
        </div>
        <Badge tone="blue">{rows.length} строк</Badge>
      </div>
      <div className="table-wrap">
        <table className="data-table decoding-table">
          <thead>
            <tr>
              <th>Машина</th><th>Путевой</th><th>Одометр / м/ч</th><th>Начало</th>
              <th>Получено</th><th>Сдано</th><th>Расход</th><th>Норма</th>
              <th>+/-</th><th>Конец</th><th>Распределено</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const distributed = Number(distributedLiters(decodingState, document.id, row) || 0)
              const difference = Number(row.spent || 0) - distributed
              return (
                <tr key={`${row.statementId}-${row.materialName}`}>
                  <td>
                    <b>{row.vehicleShortNo}</b>
                    <small>{row.vehicleModel} · {row.vehicleReg}</small>
                  </td>
                  <td>№ {row.lastWaybillNumber || '—'}</td>
                  <td>{workValue(row)}</td>
                  <td>{nfmt(row.start)}</td>
                  <td>{nfmt(row.received)}</td>
                  <td>{nfmt(row.surrendered)}</td>
                  <td>{nfmt(row.spent)}</td>
                  <td>{row.norm === null ? '—' : nfmt(row.norm)}</td>
                  <td>{row.variance === null ? '—' : nfmt(row.variance)}</td>
                  <td>{nfmt(row.end)}</td>
                  <td>
                    <Badge tone={Math.abs(difference) <= 0.05 ? 'ok' : 'warn'}>
                      {nfmt(distributed)} л
                    </Badge>
                  </td>
                  <td><Button small onClick={() => onEdit(row)}>Плотности</Button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
