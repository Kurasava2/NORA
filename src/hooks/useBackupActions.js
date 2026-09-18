import { useCallback } from 'react'
import { STORAGE_VERSION, migrateState } from '../lib/domain.js'
import { reportRendererError } from '../lib/runtime.js'

export default function useBackupActions({
  state,
  history,
  notify,
  confirmAction,
  runExclusive,
  goHome,
  setLoadError,
  setSaveError,
}) {
  const exportBackup = useCallback(() => {
    return runExclusive('резервное копирование', async () => {
      const backupFileName = `ГСМ_универсальная_копия_${new Date().toISOString().slice(0, 10)}.gsmbackup`

      if (!window.desktopAPI?.isElectron) {
        notify('Резервная копия доступна в настольной сборке.', true)
        return
      }

      const exportResult = await window.desktopAPI.exportBackup(state, backupFileName)
      if (exportResult?.success) {
        notify('Резервная копия сохранена')
      } else if (!exportResult?.canceled) {
        notify(exportResult?.error || 'Ошибка сохранения', true)
      }
    })
  }, [runExclusive, state, notify])

  const importBackup = useCallback(() => {
    return runExclusive('восстановление резервной копии', async () => {
      if (!window.desktopAPI?.isElectron) {
        notify('Импорт резервной копии доступен в настольной сборке.', true)
        return
      }

      const importResult = await window.desktopAPI.importBackup()
      if (importResult?.success) {
        const sourceSchemaVersion = Number(
          importResult.meta?.dataSchemaVersion ?? importResult.data?.version ?? 0,
        )
        if (Number.isFinite(sourceSchemaVersion) && sourceSchemaVersion > STORAGE_VERSION) {
          notify(
            `Эта резервная копия создана более новой версией данных (схема ${sourceSchemaVersion}). Обновите приложение перед восстановлением.`,
            true,
          )
          return
        }
      }

      if (!importResult?.success) {
        if (!importResult?.canceled) notify(importResult?.error || 'Не удалось открыть копию', true)
        return
      }

      const shouldRestore = await confirmAction({
        title: 'Восстановить резервную копию?',
        message: 'Текущие данные приложения будут заменены данными из выбранной копии.',
        confirmText: 'Восстановить',
        danger: true,
      })
      if (!shouldRestore) return

      try {
        const restoredState = migrateState(importResult.data)
        const saveResult = await window.desktopAPI.saveData(restoredState, { verify: true })
        if (!saveResult?.success) {
          throw new Error(saveResult?.error || 'Не удалось записать восстановленную базу на диск.')
        }

        history.commit(restoredState)
        setLoadError('')
        setSaveError('')
        goHome()
        notify('Резервная копия восстановлена')
      } catch (error) {
        reportRendererError('backup:restore', error)
        notify(`Резервную копию не удалось восстановить: ${error?.message || error}`, true)
      }
    })
  }, [runExclusive, notify, confirmAction, history, setLoadError, setSaveError, goHome])

  return { exportBackup, importBackup }
}
