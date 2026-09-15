import React from 'react'
import { classNames } from './classNames.js'

export default function Button({
  children,
  primary,
  danger,
  ghost,
  small,
  icon,
  className,
  ...buttonProps
}) {
  return (
    <button
      className={classNames(
        'btn',
        primary && 'btn-primary',
        danger && 'btn-danger',
        ghost && 'btn-ghost',
        small && 'btn-small',
        icon && 'btn-icon',
        className,
      )}
      {...buttonProps}
    >
      {children}
    </button>
  )
}
