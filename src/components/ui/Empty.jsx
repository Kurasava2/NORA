import React from 'react'
import { classNames } from './classNames.js'

export default function Empty({ title, text, action, compact = false }) {
  return (
    <div className={classNames('empty', compact && 'empty-compact')}>
      <b>{title}</b>
      <span>{text}</span>
      {action}
    </div>
  )
}
