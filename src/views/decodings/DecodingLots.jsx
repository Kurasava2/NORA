import React from 'react'
import { Badge, Button, Card } from '../../components/ui.jsx'
import { decimalMultiply } from '../../lib/decodings/decimal.js'
import { materialLots } from '../../lib/decodings/selectors.js'

function sourceLabel(sourceType) {
  if (sourceType === 'opening') return 'Начальный остаток'
  if (sourceType === 'manual-adjustment') return 'Корректировка'
  return 'Поступление'
}

export default function DecodingLots({ decodingState, materialName, onAddLot }) {
  const lots = materialLots(decodingState, materialName)

  return (
    <Card>
      <div className="section-heading">
        <div>
          <h3>Партии и плотности</h3>
          <p>Одна плотность относится к конкретной партии и сохраняется между месяцами.</p>
        </div>
        <Button primary onClick={onAddLot}>＋ Партия</Button>
      </div>
      <div className="density-lot-list">
        {lots.map(lot => (
          <div className="density-lot-row" key={lot.id}>
            <div>
              <b>ρ {String(lot.density).replace('.', ',')}</b>
              <small>{lot.date} · {sourceLabel(lot.sourceType)}</small>
            </div>
            <div><span>Исходно</span><b>{lot.volumeLiters} л</b></div>
            <div><span>Остаток</span><b>{lot.remaining ?? '—'} л</b></div>
            <div><span>Масса остатка</span><b>{decimalMultiply(lot.remaining || '0', lot.density)} кг</b></div>
            <Badge tone={Number(lot.remainingNumber) < -0.05 ? 'bad' : 'blue'}>
              {lot.note || 'партия'}
            </Badge>
          </div>
        ))}
        {!lots.length && (
          <div className="empty-decoding-row">Для этого материала ещё нет партий плотности.</div>
        )}
      </div>
    </Card>
  )
}
