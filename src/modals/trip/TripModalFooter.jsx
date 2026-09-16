import React from 'react'
import { Button } from '../../components/ui.jsx'

export default function TripModalFooter({ editingId, actions }) {
  return (
    <div className="modal-actions sticky-actions">
      {editingId ? (
        <Button type="button" danger onClick={actions.deleteTrip}>Удалить</Button>
      ) : (
        <span />
      )}
      <div className="action-cluster">
        <span className="shortcut">Ctrl + Enter</span>
        <Button type="button" onClick={actions.requestClose}>Отмена</Button>
        <Button id="trip-submit" primary type="submit">
          {editingId ? 'Сохранить изменения' : 'Сохранить путёвку'}
        </Button>
      </div>
    </div>
  )
}
