import React from 'react'

export default function FormulaTokens({ form, rule, onInsert }) {
  const parameterCodes = (form.autoCalc?.params || []).map(parameter => parameter.code)
  const otherRuleCodes = (form.autoCalc?.rules || [])
    .filter(candidateRule => candidateRule.id !== rule.id)
    .map(candidateRule => candidateRule.code)
  const availableTokens = ['КМ', 'МОТОЧАСЫ', 'НОРМА', ...parameterCodes, ...otherRuleCodes]
  const uniqueTokens = [...new Set(availableTokens.filter(Boolean))]

  return (
    <div className="formula-token-row">
      <span>Вставить:</span>
      {uniqueTokens.map(token => (
        <button
          type="button"
          className="formula-token"
          key={token}
          onClick={() => onInsert(token)}
        >
          {token}
        </button>
      ))}
    </div>
  )
}
