import React from 'react'
import { materialDisplayName, nfmt, statementMaterialNames } from '../../lib/domain.js'
import { Card } from '../ui.jsx'

export default function BalancePanel({ statement, total }) {
  const materialNames = statementMaterialNames(statement)

  return (
    <Card className="balance-card">
      <h3>Итоги месяца</h3>
      {materialNames.length ? (
        materialNames.map(materialName => (
          <div className="total-block" key={materialName}>
            <b>{materialDisplayName(materialName)}</b>
            <div><span>Начало</span><strong>{nfmt(total[materialName]?.start)} л</strong></div>
            <div><span>Получено</span><strong>{nfmt(total[materialName]?.received)} л</strong></div>
            <div><span>Расход</span><strong>{nfmt(total[materialName]?.spent)} л</strong></div>
            <div><span>Остаток</span><strong>{nfmt(total[materialName]?.end)} л</strong></div>
          </div>
        ))
      ) : (
        <span className="muted">Нет ГСМ</span>
      )}
    </Card>
  )
}
