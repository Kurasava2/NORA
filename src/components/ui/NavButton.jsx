import React from 'react'
import { classNames } from './classNames.js'

export default function NavButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={classNames('nav-button', active && 'active')}>
      <span>{icon}</span>
      {label}
    </button>
  )
}
