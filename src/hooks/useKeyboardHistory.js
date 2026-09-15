import { useEffect } from 'react'

export default function useKeyboardHistory({ undo, redo }) {
  useEffect(() => {
    const handleKeyDown = keyboardEvent => {
      if (!(keyboardEvent.ctrlKey || keyboardEvent.metaKey)) return

      const targetTagName = keyboardEvent.target?.tagName?.toLowerCase()
      const isEditing =
        ['input', 'textarea', 'select'].includes(targetTagName) ||
        keyboardEvent.target?.isContentEditable
      if (isEditing) return

      const key = keyboardEvent.key.toLowerCase()
      if (key === 'z') {
        keyboardEvent.preventDefault()
        keyboardEvent.shiftKey ? redo() : undo()
      } else if (key === 'y') {
        keyboardEvent.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])
}
