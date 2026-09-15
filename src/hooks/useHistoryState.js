import { useCallback, useRef, useState } from 'react'
import { clone } from '../lib/domain.js'

export default function useHistoryState(initialState, maxEntries = 50) {
  const [state, setState] = useState(initialState)
  const historyRef = useRef({ past: [], future: [] })
  const [, forceRender] = useState(0)

  const replaceState = useCallback(
    (nextStateOrUpdater, { record = true } = {}) => {
      setState(previousState => {
        const resolvedState =
          typeof nextStateOrUpdater === 'function'
            ? nextStateOrUpdater(previousState)
            : nextStateOrUpdater
        if (resolvedState === previousState) return previousState

        if (record) {
          const historyState = historyRef.current
          historyState.past.push(clone(previousState))
          if (historyState.past.length > maxEntries) historyState.past.shift()
          historyState.future = []
        }
        return resolvedState
      })
      forceRender(renderCount => renderCount + 1)
    },
    [maxEntries],
  )

  const undo = useCallback(() => {
    const historyState = historyRef.current
    if (!historyState.past.length) return

    setState(previousState => {
      const restoredState = historyState.past.pop()
      historyState.future.push(clone(previousState))
      if (historyState.future.length > maxEntries) historyState.future.shift()
      return restoredState
    })
    forceRender(renderCount => renderCount + 1)
  }, [maxEntries])

  const redo = useCallback(() => {
    const historyState = historyRef.current
    if (!historyState.future.length) return

    setState(previousState => {
      const restoredState = historyState.future.pop()
      historyState.past.push(clone(previousState))
      if (historyState.past.length > maxEntries) historyState.past.shift()
      return restoredState
    })
    forceRender(renderCount => renderCount + 1)
  }, [maxEntries])

  const resetHistory = useCallback(() => {
    historyRef.current = { past: [], future: [] }
    forceRender(renderCount => renderCount + 1)
  }, [])

  return {
    state,
    setState: nextStateOrUpdater => replaceState(nextStateOrUpdater, { record: false }),
    commit: replaceState,
    undo,
    redo,
    resetHistory,
    canUndo: historyRef.current.past.length > 0,
    canRedo: historyRef.current.future.length > 0,
  }
}
