import React from 'react'
import { Badge, Button } from '../../components/ui.jsx'
import { materialDisplayName } from '../../lib/domain.js'

export default function CatalogTable({ materials, usesCount, onDelete }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Категория</th>
            <th>Наименование</th>
            <th>Алиасы</th>
            <th>Используется в путёвках</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {materials.map(material => (
            <tr key={material.id || material.name}>
              <td>
                <Badge tone={material.category === 'Топливо' ? 'blue' : 'neutral'}>
                  {material.category}
                </Badge>
              </td>
              <td><b>{materialDisplayName(material.name)}</b></td>
              <td>
                <div className="chip-row table-chips">
                  {(material.aliases || []).map(alias => (
                    <span className="chip subtle" key={alias}>{alias}</span>
                  ))}
                </div>
              </td>
              <td className="num">{usesCount(material.name)}</td>
              <td className="actions-cell">
                <div className="row-actions">
                  <Button small danger onClick={() => onDelete(material.name)}>Удалить</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
