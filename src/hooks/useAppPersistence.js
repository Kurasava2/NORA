import { useCallback, useRef, useState } from 'react'
import useAutosave from './persistence/useAutosave.js'
import useInitialPersistenceLoad from './persistence/useInitialPersistenceLoad.js'
import useWindowCloseRequest from './persistence/useWindowCloseRequest.js'
import { DEFAULT_STATE, migrateState } from '../lib/domain.js'
import { isDesktopRuntime, savePersistedState } from '../lib/persistence/storage.js'
import { reportRendererError } from '../lib/runtime.js'

export default function useAppPersistence({
  state,
  history,
  notify,
  confirmAction,
  goHome,
}) {
  const [ready, setReady] = useState(false)
  const [appInfo, setAppInfo] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const stateRef = useRef(state)
  stateRef.current = state

  useInitialPersistenceLoad({
    history,
    notify,
    setReady,
    setAppInfo,
    setLoadError,
  })
  useAutosave({ state, ready, loadError, notify, setSaveError })

  const saveCurrent = useCallback(
    async (showSuccess = true) => {
      if (loadError) {
        notify(
          'Сохранение заблокировано: сначала восстановите или сбросьте повреждённую базу.',
          true,
        )
        return { success: false, error: loadError }
      }

      try {
        await savePersistedState(stateRef.current)
        setSaveError('')
        if (showSuccess) notify('Данные сохранены')
        return { success: true }
      } catch (error) {
        reportRendererError('save:manual', error)
        const errorMessage = error?.message || String(error)
        setSaveError(errorMessage)
        notify(`Не удалось сохранить данные: ${errorMessage}`, true)
        return { success: false, error: errorMessage }
      }
    },
    [loadError, notify],
  )

  const completeClose = useCallback(async () => {
    const result = await window.desktopAPI.completeClose()
    if (result?.success === false) {
      const errorMessage = result.error || 'Не удалось закрыть базу SQLite.'
      setSaveError(errorMessage)
      notify(errorMessage, true)
      await window.desktopAPI.cancelClose?.()
      return false
    }
    return true
  }, [notify])

  const closeApp = useCallback(async () => {
    if (!isDesktopRuntime()) return

    if (!ready) {
      await completeClose()
      return
    }

    if (loadError) {
      const shouldClose = await confirmAction({
        title: 'Закрыть без сохранения?',
        message: 'Локальная база не была загружена. Закрыть приложение без сохранения?',
        confirmText: 'Закрыть',
        danger: true,
      })
      if (shouldClose) await completeClose()
      else await window.desktopAPI.cancelClose?.()
      return
    }

    const saveResult = await saveCurrent(false)
    if (saveResult.success) await completeClose()
    else await window.desktopAPI.cancelClose?.()
  }, [ready, loadError, confirmAction, saveCurrent, completeClose])

  useWindowCloseRequest(closeApp)

  const startFreshDatabase = useCallback(async () => {
    const shouldReset = await confirmAction({
      title: 'Создать пустую базу?',
      message:
        'Текущая повреждённая база не будет перезаписана без резервного файла восстановления.',
      confirmText: 'Создать базу',
      danger: true,
    })
    if (!shouldReset) return

    const freshState = migrateState(DEFAULT_STATE)
    try {
      await savePersistedState(freshState, { verify: true })
      history.setState(freshState)
      history.resetHistory()
      setLoadError('')
      setSaveError('')
      goHome()
      notify('Создана новая пустая база')
    } catch (error) {
      reportRendererError('database:new', error)
      notify(`Не удалось создать новую базу: ${error?.message || error}`, true)
    }
  }, [confirmAction, history, goHome, notify])

  return {
    ready,
    appInfo,
    loadError,
    saveError,
    setLoadError,
    setSaveError,
    saveCurrent,
    closeApp,
    startFreshDatabase,
  }
}
