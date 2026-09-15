import React from 'react'
import { Badge, Button } from '../../components/ui.jsx'
import { kmfmt, nfmt } from '../../lib/domain.js'

export default function PeriodFleetTable({ rows, onHistory, onOpenVehicle }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Машина</th><th>Модель</th><th>Рег. №</th><th>Статус</th>
            <th>Путёвок</th><th>Пробег</th><th>Топливо</th><th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(fleetRow => (
            <tr key={fleetRow.vehicle.id} className="hover-row">
              <td><b className="mono-lg">{fleetRow.vehicle.shortNo}</b></td>
              <td>{fleetRow.vehicle.model}</td>
              <td>{fleetRow.vehicle.reg}</td>
              <td><Badge tone={fleetRow.status.tone}>{fleetRow.status.label}</Badge></td>
              <td className="num">{fleetRow.stats.trips}</td>
              <td className="num">{kmfmt(fleetRow.stats.km)} км</td>
              <td className="num">{nfmt(fleetRow.stats.fuel)} л</td>
              <td className="actions-cell">
                <div className="row-actions">
                  <Button small onClick={() => onHistory(fleetRow.vehicle.id)}>История</Button>
                  <Button
                    small
                    primary
                    icon
                    onClick={() => onOpenVehicle(fleetRow.vehicle)}
                    title="Открыть ведомость"
                    aria-label="Открыть ведомость"
                  >
                    ✎
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
