import React from 'react'
import { Badge, Button, Card } from '../../components/ui.jsx'
import { densityInputsForMaterial } from '../../lib/decodings/selectors.js'
import { DENSITY_ENTRY_OPENING } from '../../lib/decodings/model.js'

function vehicleLabel(document, receipt) {
  const row = (document?.sourceSnapshot?.rows || []).find(
    sourceRow => sourceRow.vehicleId === receipt.vehicleId,
  )
  return row ? `${row.vehicleShortNo} · ${row.vehicleModel}` : receipt.vehicleId
}

export default function DecodingReceipts({ state, document, materialName, onAdd, onDelete }) {
  const receipts = densityInputsForMaterial(state, document, materialName)

  return (
    <Card>
      <div className="section-heading">
        <div>
          <h3>Входные данные плотностей · {materialName}</h3>
          <p>Начальный остаток задаётся один раз, выдачи переносятся из бумажной раздаточной.</p>
        </div>
        <div className="section-actions">
          <Badge tone="blue">{receipts.length} записей</Badge>
          <Button primary onClick={onAdd}>＋ Выдача</Button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table decoding-receipts-table">
          <thead>
            <tr>
              <th>Тип</th><th>Дата</th><th>Машина</th><th>Путёвка</th><th>Плотность</th><th>Литры</th><th></th>
            </tr>
          </thead>
          <tbody>
            {receipts.map(receipt => (
              <tr key={receipt.id}>
                <td>
                  <Badge tone={receipt.kind === DENSITY_ENTRY_OPENING ? 'blue' : 'ok'}>
                    {receipt.kind === DENSITY_ENTRY_OPENING ? 'начало' : 'выдача'}
                  </Badge>
                </td>
                <td>{receipt.date || '—'}</td>
                <td><b>{vehicleLabel(document, receipt)}</b></td>
                <td>{receipt.kind === DENSITY_ENTRY_OPENING ? '—' : `№ ${receipt.waybillNumber || '—'}`}</td>
                <td>ρ {String(receipt.density).replace('.', ',')}</td>
                <td>{receipt.liters}</td>
                <td>
                  <Button
                    small
                    icon
                    title="Удалить запись"
                    aria-label="Удалить запись"
                    onClick={() => onDelete(receipt)}
                  >×</Button>
                </td>
              </tr>
            ))}
            {!receipts.length && (
              <tr><td colSpan="7" className="empty-decoding-row">Плотности ещё не внесены.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
