import React from 'react'
import { Badge, Button, Empty } from '../../components/ui.jsx'
import {
  kmfmt,
  materialDisplayName,
  nfmt,
  periodMonthName,
  periodName,
  periodYear,
} from '../../lib/domain.js'

export default function HistoryTable({ rows, vehicle, onOpen }) {
  if (!rows.length) {
    return <Empty compact title="История пока пуста" text="Для этой машины ещё не создавались ведомости." />
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Месяц</th><th>Период</th><th>Статус</th><th>Путёвок</th><th>Пробег</th>
            {vehicle.hasMotohours && <th>Моточасы</th>}
            <th>Топливо</th><th>Конечные остатки</th><th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(historyRow => (
            <tr key={historyRow.period.id} className="hover-row">
              <td><b>{periodMonthName(historyRow.period)} {periodYear(historyRow.period)}</b></td>
              <td>{periodName(historyRow.period)}</td>
              <td><Badge tone={historyRow.status.tone}>{historyRow.status.label}</Badge></td>
              <td className="num">{historyRow.stats.trips}</td>
              <td className="num">{kmfmt(historyRow.stats.km)} км</td>
              {vehicle.hasMotohours && (
                <td className="num">{nfmt(historyRow.stats.motohours)} м/ч</td>
              )}
              <td className="num">{nfmt(historyRow.stats.fuel)} л</td>
              <td>
                {Object.entries(historyRow.balances).map(([materialName, balance]) => (
                  <div key={materialName}>
                    {materialDisplayName(materialName)}: <b>{nfmt(balance)}</b>
                  </div>
                ))}
              </td>
              <td className="actions-cell">
                <div className="row-actions">
                  <Button small primary onClick={() => onOpen(historyRow.period, historyRow.statement)}>
                    Открыть
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
