import { useCallback } from 'react'

export default function useSaveRenderedXlsx(notify) {
  return useCallback(
    async (bytes, fileName) => {
      const saveResult = await window.desktopAPI.saveBinary(bytes, fileName, [
        { name: 'Excel', extensions: ['xlsx'] },
      ])

      if (saveResult?.success) {
        notify('XLSX сохранён')
      } else if (!saveResult?.canceled) {
        notify(saveResult?.error || 'Ошибка сохранения XLSX', true)
      }
    },
    [notify],
  )
}
