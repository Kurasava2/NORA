import React from 'react'
import { Badge, Card } from '../../components/ui.jsx'
import { nfmt } from '../../lib/domain.js'
import { materialSourceRows, sourceRowDistribution } from '../../lib/decodings/selectors.js'

function workValue(row) {
  if (row.motohoursEnd !== null) return `${nfmt(row.motohoursEnd)} м/ч`
  return row.odometerEnd === null ? '—' : `${nfmt(row.odometerEnd)} км`
}

function mismatchText(label, actual, target) {
  const delta = Number(target || 0) - Number(actual || 0)
  if (Math.abs(delta) <= 0.05) return null
  return `${label}: ${delta > 0 ? 'не хватает' : 'лишних'} ${nfmt(Math.abs(delta))} л`
}

function rowMismatches(split, row) {
  return [
    mismatchText('Начало', split.opening, row.start),
    mismatchText('Получено', split.received, row.received),
    mismatchText('Сдано', split.surrendered, row.surrendered || 0),
    mismatchText('Расход', split.spent, row.spent),
    mismatchText('Конец', split.end, row.end),
  ].filter(Boolean)
}

export default function DecodingSourceTable({ decodingState, document, materialName }) {
  const rows = materialSourceRows(document, materialName)

  return (
    <Card>
      <div className="section-heading">
        <div>
          <h3>Сверка с автомобильными ведомостями · {materialName}</h3>
          <p>Сразу видно, какие литры ещё не разнесены по плотностям или введены лишними.</p>
        </div>
        <Badge tone="blue">{rows.length} строк</Badge>
      </div>
      <div className="table-wrap">
        <table className="data-table decoding-table">
          <thead>
            <tr>
              <th>Машина</th><th>Путевой</th><th>Одометр / м/ч</th><th>Начало</th>
              <th>Получено</th><th>Сдано</th><th>Расход</th><th>Норма</th><th>Конец</th><th>Контроль</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const split = sourceRowDistribution(decodingState, document, row)
              const mismatches = rowMismatches(split, row)
              return (
                <tr key={`${row.statementId}-${row.materialName}`}>
                  <td><b>{row.vehicleShortNo}</b><small>{row.vehicleModel} · {row.vehicleReg}</small></td>
                  <td>№ {row.lastWaybillNumber || '—'}</td>
                  <td>{workValue(row)}</td>
                  <td>{nfmt(row.start)}</td>
                  <td>{nfmt(row.received)}</td>
                  <td>{nfmt(row.surrendered || 0)}</td>
                  <td>{nfmt(row.spent)}</td>
                  <td>{row.norm === null ? '—' : nfmt(row.norm)}</td>
                  <td>{nfmt(row.end)}</td>
                  <td>
                    {!mismatches.length && <Badge tone="ok">совпадает</Badge>}
                    {!!mismatches.length && (
                      <div className="decoding-mismatch-list">
                        {mismatches.map(message => <span key={message}>{message}</span>)}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
