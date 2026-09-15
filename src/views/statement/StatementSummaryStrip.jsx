import React from 'react'
import { Badge } from '../../components/ui.jsx'
import { nfmt, statementMaterialNames, vehicleRateLabel } from '../../lib/domain.js'

export default function StatementSummaryStrip({ statement, vehicle, status }) {
  return (
    <div className="statement-strip">
      <div><span>Статус</span><Badge tone={status.tone}>{status.label}</Badge></div>
      <div><span>Норма</span><b>{vehicleRateLabel(vehicle)}</b></div>
      <div><span>Бак</span><b>{vehicle.tankCapacity ? `${nfmt(vehicle.tankCapacity)} л` : '—'}</b></div>
      <div className="grow">
        <span>ГСМ в путёвках</span>
        <div className="chip-row">
          {statementMaterialNames(statement).map(materialName => (
            <span className="chip" key={materialName}>{materialName}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
