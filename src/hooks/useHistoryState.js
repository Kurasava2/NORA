import { useCallback, useRef, useState } from 'react'
import { clone } from '../lib/domain.js'

export default function useHistoryState(initial, max = 50) {
  const [state, setState] = useState(initial)
  const historyRef = useRef({ past: [], future: [] })
  const [, forceRender] = useState(0)

  const replace = useCallback((next, { record = true } = {}) => {
    setState(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next
      if (resolved === prev) return prev
      if (record) {
        const h = historyRef.current
        h.past.push(clone(prev))
        if (h.past.length > max) h.past.shift()
        h.future = []
      }
      return resolved
    })
    forceRender(v => v + 1)
  }, [max])

  const undo = useCallback(() => {
    const h = historyRef.current
    if (!h.past.length) return
    setState(prev => {
      const next = h.past.pop()
      h.future.push(clone(prev))
      if (h.future.length > max) h.future.shift()
      return next
    })
    forceRender(v => v + 1)
  }, [max])

  const redo = useCallback(() => {
    const h = historyRef.current
    if (!h.future.length) return
    setState(prev => {
      const next = h.future.pop()
      h.past.push(clone(prev))
      if (h.past.length > max) h.past.shift()
      return next
    })
    forceRender(v => v + 1)
  }, [max])

  const resetHistory = useCallback(() => {
    historyRef.current = { past: [], future: [] }
    forceRender(v => v + 1)
  }, [])

  return {
    state,
    setState: next => replace(next, { record: false }),
    commit: replace,
    undo,
    redo,
    resetHistory,
    canUndo: historyRef.current.past.length > 0,
    canRedo: historyRef.current.future.length > 0
  }
}
