import { useEffect } from 'react'
import { migrateState } from '../../lib/domain.js'
import { loadAppInfo, loadPersistedState } from '../../lib/persistence/storage.js'
import { reportRendererError } from '../../lib/runtime.js'

function recoveryMessage(recoveredFrom) {
  if (recoveredFrom === 'backup') return 'резервной копии базы'
  return 'временного файла незавершённого сохранения'
}

export default function useInitialPersistenceLoad({
  history,
  notify,
  setReady,
  setAppInfo,
  setLoadError,
}) {
  useEffect(() => {
    let active = true

    async function loadInitialState() {
      try {
        const [loadResult, appInfo] = await Promise.all([loadPersistedState(), loadAppInfo()])
        if (!active) return

        setAppInfo(appInfo)
        if (loadResult.data) history.setState(migrateState(loadResult.data))
        history.resetHistory()
        setLoadError('')

        if (loadResult.recoveredFrom) {
          notify(
            `База восстановлена из ${recoveryMessage(loadResult.recoveredFrom)}. Проверьте последние изменения.`,
            true,
          )
        }
      } catch (error) {
        if (!active) return
        reportRendererError('startup:load', error)
        const errorMessage = error?.message || String(error)
        setLoadError(errorMessage)
        notify(`База не загружена: ${errorMessage}`, true)
      } finally {
        if (active) setReady(true)
      }
    }

    loadInitialState()
    return () => {
      active = false
    }
  }, [])
}
