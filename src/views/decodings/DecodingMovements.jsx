import React from 'react'
import { Badge, Button, Card } from '../../components/ui.jsx'
import { materialMovements } from '../../lib/decodings/selectors.js'

function kindLabel(kind) {
  if (kind === 'carry') return 'Перенос'
  if (kind === 'opening') return 'Начало'
  if (kind === 'surrendered') return 'Сдано'
  return 'Получено'
}

export default function DecodingMovements({
  decodingState,
  document,
  materialName,
  sourceRows,
  onAdd,
  onDelete,
}) {
  const movements = materialMovements(decodingState, document, materialName)
  const vehicles = new Map(sourceRows.map(row => [row.vehicleId, row]))

  return (
    <Card>
      <div className="section-heading">
        <div>
          <h3>Плотности из раздаточной</h3>
          <p>Получение вводится вручную; перенос с прошлого периода формируется автоматически.</p>
        </div>
        <Button primary onClick={onAdd}>＋ Запись</Button>
      </div>
      <div className="table-wrap">
        <table className="data-table decoding-movement-table">
          <thead>
            <tr>
              <th>Дата</th><th>Машина</th><th>Путевой</th><th>Движение</th>
              <th>Плотность</th><th>Литры</th><th>Примечание</th><th></th>
            </tr>
          </thead>
          <tbody>
            {movements.map(movement => {
              const vehicle = vehicles.get(movement.vehicleId)
              return (
                <tr key={movement.id}>
                  <td>{movement.date}</td>
                  <td><b>{vehicle?.vehicleShortNo || movement.vehicleId}</b></td>
                  <td>{movement.waybillNumber ? `№ ${movement.waybillNumber}` : '—'}</td>
                  <td><Badge tone={movement.kind === 'carry' ? 'blue' : 'ok'}>{kindLabel(movement.kind)}</Badge></td>
                  <td>ρ {String(movement.density).replace('.', ',')}</td>
                  <td>{movement.liters}</td>
                  <td>{movement.note || '—'}</td>
                  <td>
                    {!movement.generated && (
                      <Button small onClick={() => onDelete(movement)}>×</Button>
                    )}
                  </td>
                </tr>
              )
            })}
            {!movements.length && (
              <tr><td colSpan="8" className="empty-decoding-row">Записей плотности пока нет.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
