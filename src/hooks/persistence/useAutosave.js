import { useEffect, useRef } from 'react'
import { savePersistedState } from '../../lib/persistence/storage.js'
import { reportRendererError } from '../../lib/runtime.js'

export default function useAutosave({ state, ready, loadError, notify, setSaveError }) {
  const saveTimerRef = useRef(null)

  useEffect(() => {
    if (!ready || loadError || state.settings.autosave === false) return undefined

    clearTimeout(saveTimerRef.current)
    let idleCallbackId = null

    const saveAutomatically = async () => {
      try {
        await savePersistedState(state)
        setSaveError('')
      } catch (error) {
        reportRendererError('autosave', error)
        const errorMessage = error?.message || String(error)
        setSaveError(errorMessage)
        notify(`Автосохранение не выполнено: ${errorMessage}`, true)
      }
    }

    const scheduleSave = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleCallbackId = window.requestIdleCallback(saveAutomatically, { timeout: 1800 })
      } else {
        saveAutomatically()
      }
    }

    saveTimerRef.current = setTimeout(
      scheduleSave,
      Math.max(0, Number(state.settings.autosaveDelay) || 0),
    )

    return () => {
      clearTimeout(saveTimerRef.current)
      if (idleCallbackId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleCallbackId)
      }
    }
  }, [state, ready, loadError, notify, setSaveError])
}
