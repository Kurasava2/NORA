import React from 'react'
import { Badge, Card } from '../../components/ui.jsx'
import { nfmt } from '../../lib/domain.js'
import { documentMaterials, materialSummary } from '../../lib/decodings/selectors.js'

export default function DecodingMaterialCards({
  decodingState,
  document,
  selected,
  onSelect,
}) {
  const materials = documentMaterials(document)

  return (
    <div className="decoding-material-grid">
      {materials.map(materialName => {
        const summary = materialSummary(decodingState, document, materialName)
        const ready = summary.mismatches === 0
        return (
          <button
            className={`decoding-material-card ${selected === materialName ? 'selected' : ''}`}
            key={materialName}
            onClick={() => onSelect(materialName)}
          >
            <Card>
              <div className="decoding-material-head">
                <b>{materialName}</b>
                <Badge tone={ready ? 'ok' : 'warn'}>
                  {ready ? 'сходится' : `${summary.mismatches} машин не сходится`}
                </Badge>
              </div>
              <div className="decoding-material-meta">
                <span>{summary.machines} машин</span>
                <span>{summary.densities} плотностей</span>
                <span>{summary.receipts} выдач</span>
              </div>
              <div className="decoding-material-totals">
                <span>Начало <b>{nfmt(summary.start)}</b></span>
                <span>Получено <b>{nfmt(summary.received)}</b></span>
                <span>Расход <b>{nfmt(summary.spent)}</b></span>
                <span>Конец <b>{nfmt(summary.end)}</b></span>
              </div>
            </Card>
          </button>
        )
      })}
    </div>
  )
}
