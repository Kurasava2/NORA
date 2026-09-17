import React from 'react'
import { Badge, Card } from '../../components/ui.jsx'
import { buildMaterialLedger } from '../../lib/decodings/ledger.js'
import { decimalNumber, decimalSum } from '../../lib/decodings/decimal.js'
import { materialSourceRows } from '../../lib/decodings/selectors.js'

function sum(rows, fieldName) {
  return decimalNumber(decimalSum(rows.map(row => row[fieldName] ?? '0'))) || 0
}

function pair(expected, actual) {
  return `${expected} / ${actual}`
}

export default function DecodingControlTable({ state, document, materialName }) {
  const sourceRows = materialSourceRows(document, materialName)
  const ledger = buildMaterialLedger(state, document, materialName)
  const tolerance = Number(state.settings?.tolerance || 0.05)

  return (
    <Card>
      <div className="section-heading">
        <div>
          <h3>Сверка с ведомостью · {materialName}</h3>
          <p>Слева исходная ведомость, справа сумма всех плотностей.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table decoding-control-table">
          <thead>
            <tr><th>Машина</th><th>Начало</th><th>Получено</th><th>Расход</th><th>Конец</th><th>Статус</th></tr>
          </thead>
          <tbody>
            {sourceRows.map(sourceRow => {
              const rows = ledger.rows.filter(row => row.statementId === sourceRow.statementId)
              const values = {
                start: sum(rows, 'start'),
                received: sum(rows, 'received'),
                spent: sum(rows, 'spent'),
                end: sum(rows, 'end'),
              }
              const delta = Math.max(
                Math.abs(Number(sourceRow.start || 0) - values.start),
                Math.abs(Number(sourceRow.received || 0) - values.received),
                Math.abs(Number(sourceRow.spent || 0) - values.spent),
                Math.abs(Number(sourceRow.end || 0) - values.end),
              )
              return (
                <tr key={sourceRow.statementId}>
                  <td><b>{sourceRow.vehicleShortNo}</b><small>{sourceRow.vehicleModel}</small></td>
                  <td>{pair(sourceRow.start, values.start)}</td>
                  <td>{pair(sourceRow.received, values.received)}</td>
                  <td>{pair(sourceRow.spent, values.spent)}</td>
                  <td>{pair(sourceRow.end, values.end)}</td>
                  <td><Badge tone={delta <= tolerance ? 'ok' : 'warn'}>{delta <= tolerance ? 'сходится' : `Δ ${delta} л`}</Badge></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
