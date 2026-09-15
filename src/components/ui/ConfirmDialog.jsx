import React from 'react'
import Button from './Button.jsx'
import Modal from './Modal.jsx'

export default function ConfirmDialog({ dialog, onResolve }) {
  if (!dialog) return null

  return (
    <Modal
      open
      title={dialog.title || 'Подтверждение'}
      subtitle={dialog.subtitle}
      onClose={() => onResolve(false)}
    >
      <div className="confirm-body">
        <p>{dialog.message}</p>
        {dialog.detail && <small>{dialog.detail}</small>}
      </div>
      <div className="modal-actions">
        <Button onClick={() => onResolve(false)}>{dialog.cancelText || 'Отмена'}</Button>
        <Button
          danger={dialog.danger !== false}
          primary={dialog.danger === false}
          onClick={() => onResolve(true)}
        >
          {dialog.confirmText || 'Подтвердить'}
        </Button>
      </div>
    </Modal>
  )
}
