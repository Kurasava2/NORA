import { useEffect } from 'react'
import { savePersistedStateSync } from '../../lib/persistence/storage.js'

export default function useBeforeUnloadSave({ stateRef, readyRef, loadErrorRef, setSaveError }) {
  useEffect(() => {
    const desktopApi = window.desktopAPI
    if (!desktopApi?.isElectron || typeof desktopApi.saveDataSync !== 'function') return undefined

    const flushBeforeClose = browserEvent => {
      if (!readyRef.current || loadErrorRef.current) return

      const saveResult = savePersistedStateSync(stateRef.current)
      if (!saveResult?.success) {
        browserEvent.preventDefault()
        browserEvent.returnValue = false
        setSaveError(saveResult?.error || 'Не удалось сохранить локальную базу перед закрытием.')
      }
    }

    window.addEventListener('beforeunload', flushBeforeClose)
    return () => window.removeEventListener('beforeunload', flushBeforeClose)
  }, [stateRef, readyRef, loadErrorRef, setSaveError])
}
