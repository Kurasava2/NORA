import React from 'react'
import { Badge, Card } from '../../components/ui.jsx'
import { nfmt } from '../../lib/domain.js'
import {
  materialSourceRows,
  sourceRowDistribution,
} from '../../lib/decodings/selectors.js'

function workValue(row) {
  if (row.motohoursEnd !== null) return `${nfmt(row.motohoursEnd)} м/ч`
  return row.odometerEnd === null ? '—' : `${nfmt(row.odometerEnd)} км`
}

function deltaTone(value, target) {
  return Math.abs(Number(value || 0) - Number(target || 0)) <= 0.05 ? 'ok' : 'warn'
}

export default function DecodingSourceTable({ decodingState, document, materialName }) {
  const rows = materialSourceRows(document, materialName)

  return (
    <Card>
      <div className="section-heading">
        <div>
          <h3>Сверка с автомобильными ведомостями · {materialName}</h3>
          <p>Сумма всех плотностей по машине должна совпасть с исходной ведомостью.</p>
        </div>
        <Badge tone="blue">{rows.length} строк</Badge>
      </div>
      <div className="table-wrap">
        <table className="data-table decoding-table">
          <thead>
            <tr>
              <th>Машина</th><th>Путевой</th><th>Одометр / м/ч</th><th>Начало</th>
              <th>Получено</th><th>Расход</th><th>Норма</th><th>Конец</th>
              <th>По плотностям</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const split = sourceRowDistribution(decodingState, document, row)
              const ready =
                deltaTone(split.opening, row.start) === 'ok' &&
                deltaTone(split.received, row.received) === 'ok' &&
                deltaTone(split.spent, row.spent) === 'ok' &&
                deltaTone(split.end, row.end) === 'ok'
              return (
                <tr key={`${row.statementId}-${row.materialName}`}>
                  <td><b>{row.vehicleShortNo}</b><small>{row.vehicleModel} · {row.vehicleReg}</small></td>
                  <td>№ {row.lastWaybillNumber || '—'}</td>
                  <td>{workValue(row)}</td>
                  <td>{nfmt(row.start)}</td>
                  <td>{nfmt(row.received)}</td>
                  <td>{nfmt(row.spent)}</td>
                  <td>{row.norm === null ? '—' : nfmt(row.norm)}</td>
                  <td>{nfmt(row.end)}</td>
                  <td>
                    <Badge tone={ready ? 'ok' : 'warn'}>
                      {ready ? 'совпадает' : `Н ${nfmt(split.opening)} · П ${nfmt(split.received)} · Р ${nfmt(split.spent)} · К ${nfmt(split.end)}`}
                    </Badge>
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
