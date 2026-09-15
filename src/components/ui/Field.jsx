import React from 'react'
import { classNames } from './classNames.js'

export default function Field({ label, hint, children, className = '' }) {
  return (
    <label className={classNames('field', className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
