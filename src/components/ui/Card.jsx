import React from 'react'
import { classNames } from './classNames.js'

export default function Card({ children, className = '', ...cardProps }) {
  return (
    <div className={classNames('card', className)} {...cardProps}>
      {children}
    </div>
  )
}
