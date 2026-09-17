import React from 'react'
import { Badge, Card } from '../../components/ui.jsx'
import { nfmt } from '../../lib/domain.js'
import { materialDensityTotals } from '../../lib/decodings/selectors.js'

function workValue(row) {
  if (row.motohoursEnd !== null) return `${nfmt(row.motohoursEnd)} м/ч`
  return row.odometerEnd === null ? '—' : `${nfmt(row.odometerEnd)} км`
}

function densityNorm(row) {
  if (row.sourceNorm === null) return null
  if (!Number(row.sourceSpent)) return 0
  return Number(row.sourceNorm) * Number(row.spent) / Number(row.sourceSpent)
}

export default function DecodingDensityTable({ decodingState, document, materialName }) {
  const groups = materialDensityTotals(decodingState, document, materialName)

  return (
    <div className="density-groups">
      {groups.map(group => (
        <Card key={group.density}>
          <div className="section-heading density-heading">
            <div>
              <h3>{materialName} · ρ {String(group.density).replace('.', ',')}</h3>
              <p>Итоговая секция формы №63 по одной плотности.</p>
            </div>
            <Badge tone="blue">{group.rows.length} машин</Badge>
          </div>
          <div className="table-wrap">
            <table className="data-table decoding-density-table">
              <thead>
                <tr>
                  <th>Машина</th><th>Путевой</th><th>Одометр / м/ч</th><th>Начало</th>
                  <th>Получено</th><th>Сдано</th><th>Расход</th><th>Норма</th>
                  <th>Экономия</th><th>Конец</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map(row => {
                  const norm = densityNorm(row)
                  const economy = norm === null ? null : norm - Number(row.spent)
                  return (
                    <tr key={`${row.statementId}-${row.density}`}>
                      <td><b>{row.vehicleShortNo}</b><small>{row.vehicleModel} · {row.vehicleReg}</small></td>
                      <td>№ {row.lastWaybillNumber || '—'}</td>
                      <td>{workValue(row)}</td>
                      <td>{nfmt(row.start)}</td>
                      <td>{nfmt(row.received)}</td>
                      <td>{nfmt(row.surrendered)}</td>
                      <td>{nfmt(row.spent)}</td>
                      <td>{norm === null ? '—' : nfmt(norm)}</td>
                      <td>{economy === null ? '—' : nfmt(economy)}</td>
                      <td>{nfmt(row.end)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr><th colSpan="3">Всего, Л</th><th>{group.start}</th><th>{group.received}</th><th>{group.surrendered}</th><th>{group.spent}</th><th></th><th></th><th>{group.end}</th></tr>
                <tr><th colSpan="3">КГ</th><th>{group.startKg}</th><th>{group.receivedKg}</th><th></th><th>{group.spentKg}</th><th></th><th></th><th>{group.endKg}</th></tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ))}
      {!groups.length && (
        <Card><div className="empty-decoding-row">Плотности ещё не заведены или расход не распределён.</div></Card>
      )}
    </div>
  )
}
