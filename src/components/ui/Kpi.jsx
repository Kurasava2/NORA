import React from 'react'
import { classNames } from './classNames.js'

export default function Kpi({ value, label, tone }) {
  return (
    <div className={classNames('kpi', tone && `kpi-${tone}`)}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  )
}
