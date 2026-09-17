import React from 'react'
import { Badge, Card } from '../../components/ui.jsx'
import { decimalSum } from '../../lib/decodings/decimal.js'
import { densityBlocks } from '../../lib/decodings/ledger.js'

function display(value) {
  if (value === null || value === undefined) return '—'
  return String(value).replace('.', ',')
}

function totals(rows, suffix = '') {
  const field = name => decimalSum(rows.map(row => row[`${name}${suffix}`] ?? '0'))
  return {
    start: field('start'),
    received: field('received'),
    surrendered: field('surrendered'),
    spent: field('spent'),
    norm: field('norm'),
    end: field('end'),
  }
}

function WorkValue({ row }) {
  if (row.motohoursEnd !== null && row.motohoursEnd !== undefined) {
    return <>{row.motohoursEnd} м/ч</>
  }
  return <>{row.odometerEnd ?? '—'}</>
}

function TotalRow({ label, values }) {
  return (
    <tr className="decoding-total-row">
      <td colSpan="5"><b>{label}</b></td>
      <td>{display(values.start)}</td>
      <td>{display(values.received)}</td>
      <td>{display(values.surrendered)}</td>
      <td>{display(values.spent)}</td>
      <td>{display(values.norm)}</td>
      <td></td>
      <td>{display(values.end)}</td>
    </tr>
  )
}

export default function DecodingDensityBlocks({ state, document, materialName }) {
  const blocks = densityBlocks(state, document, materialName)

  return (
    <div className="decoding-density-blocks">
      {blocks.map(block => {
        const liters = totals(block.rows)
        const kilograms = totals(block.rows, 'Kg')
        return (
          <Card key={block.density} className="decoding-density-card">
            <div className="section-heading">
              <div>
                <h3>{materialName} · плотность {display(block.density)}</h3>
                <p>Отдельный блок формы №63. Масса считается как литры × плотность.</p>
              </div>
              <Badge tone="blue">{display(kilograms.end)} кг остаток</Badge>
            </div>
            <div className="table-wrap">
              <table className="data-table decoding-density-table">
                <thead>
                  <tr>
                    <th>№</th><th>Модель</th><th>Машина</th><th>Путевой</th><th>Одометр / м/ч</th>
                    <th>Начало</th><th>Получено</th><th>Сдано</th><th>Расход</th><th>Норма</th>
                    <th>+/-</th><th>Конец</th>
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, index) => (
                    <tr key={`${row.statementId}-${row.density}`}>
                      <td>{index + 1}</td>
                      <td>{row.vehicleModel || '—'}</td>
                      <td><b>{row.vehicleShortNo || '—'}</b></td>
                      <td>№ {row.lastWaybillNumber || '—'}</td>
                      <td><WorkValue row={row} /></td>
                      <td>{display(row.start)}</td>
                      <td>{display(row.received)}</td>
                      <td>{display(row.surrendered)}</td>
                      <td>{display(row.spent)}</td>
                      <td>{display(row.norm)}</td>
                      <td>{display(row.variance)}</td>
                      <td>{display(row.end)}</td>
                    </tr>
                  ))}
                  <TotalRow label="Всего, Л" values={liters} />
                  <TotalRow label="КГ" values={kilograms} />
                </tbody>
              </table>
            </div>
          </Card>
        )
      })}
      {!blocks.length && (
        <Card>
          <div className="empty-decoding-row">
            Плотности ещё не определены. Внесите выдачи или начальные остатки.
          </div>
        </Card>
      )}
    </div>
  )
}
