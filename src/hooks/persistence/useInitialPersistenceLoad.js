import { useEffect } from 'react'
import { migrateState } from '../../lib/domain.js'
import {
  loadAppInfo,
  loadPersistedState,
  savePersistedState,
} from '../../lib/persistence/storage.js'
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
        const [loadResult, appInfo] = await Promise.all([
          loadPersistedState(),
          loadAppInfo(),
        ])
        if (!active) return

        setAppInfo(appInfo)
        const migratedState = loadResult.data
          ? migrateState(loadResult.data)
          : null

        if (migratedState) {
          history.setState(migratedState)
          if (loadResult.migrationRequired) {
            await savePersistedState(migratedState, { verify: true })
            if (!active) return
            notify('Старая база безопасно перенесена в SQLite')
          }
        }

        history.resetHistory()
        setLoadError('')

        if (loadResult.recoveredFrom) {
          notify(
            `База восстановлена из ${recoveryMessage(loadResult.recoveredFrom)}. ` +
              'Проверьте последние изменения.',
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
