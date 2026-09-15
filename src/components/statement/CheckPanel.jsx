import React from 'react'
import { Badge, Card } from '../ui.jsx'

export default function CheckPanel({ status }) {
  const { errors, warnings } = status.check

  return (
    <Card className="side-card">
      <div className="side-card-head">
        <h3>Проверка</h3>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      {errors.length > 0 && (
        <div className="check-list bad">
          <b>Ошибки</b>
          {errors.slice(0, 6).map((errorMessage, errorIndex) => (
            <span key={`${errorIndex}-${errorMessage}`}>{errorMessage}</span>
          ))}
          {errors.length > 6 && <small>+ ещё {errors.length - 6}</small>}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="check-list warn">
          <b>Замечания</b>
          {warnings.slice(0, 5).map((warningMessage, warningIndex) => (
            <span key={`${warningIndex}-${warningMessage}`}>{warningMessage}</span>
          ))}
        </div>
      )}
      {!errors.length && !warnings.length && <div className="all-good">✓ Контроль пройден</div>}
    </Card>
  )
}
