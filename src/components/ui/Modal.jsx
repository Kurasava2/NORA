import React, { useEffect, useRef } from 'react'
import { classNames } from './classNames.js'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  extraWide = false,
  backdropClassName = '',
}) {
  const dialogRef = useRef(null)
  const closeHandlerRef = useRef(onClose)
  closeHandlerRef.current = onClose

  useEffect(() => {
    if (!open) return undefined

    const previousFocus = document.activeElement
    const getFocusableElements = () =>
      [...(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || [])].filter(
        element => !element.hidden,
      )

    const handleKeyboard = keyboardEvent => {
      if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault()
        closeHandlerRef.current?.()
        return
      }

      if (keyboardEvent.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (!focusableElements.length) {
        keyboardEvent.preventDefault()
        dialogRef.current?.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement
      const focusOutsideDialog = !dialogRef.current?.contains(activeElement)

      if (keyboardEvent.shiftKey && (activeElement === firstElement || focusOutsideDialog)) {
        keyboardEvent.preventDefault()
        lastElement.focus()
      } else if (!keyboardEvent.shiftKey && (activeElement === lastElement || focusOutsideDialog)) {
        keyboardEvent.preventDefault()
        firstElement.focus()
      }
    }

    window.addEventListener('keydown', handleKeyboard)
    const focusFrame = window.requestAnimationFrame(() => {
      if (!dialogRef.current?.contains(document.activeElement)) {
        ;(getFocusableElements()[0] || dialogRef.current)?.focus()
      }
    })

    return () => {
      window.removeEventListener('keydown', handleKeyboard)
      window.cancelAnimationFrame(focusFrame)
      if (previousFocus?.isConnected) previousFocus.focus?.()
    }
  }, [open])

  if (!open) return null

  const handleBackdropMouseDown = mouseEvent => {
    if (mouseEvent.target === mouseEvent.currentTarget) onClose?.()
  }

  return (
    <div
      className={classNames('modal-backdrop', backdropClassName)}
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={classNames(
          'modal',
          wide && 'modal-wide',
          extraWide && 'modal-extra-wide',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Закрыть"
            title="Закрыть"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
