import { useCallback, useRef } from 'react'
import { reportRendererError } from '../lib/runtime.js'

export default function useExclusiveOperation(notify) {
  const activeOperationRef = useRef('')

  return useCallback(
    async (label, operation) => {
      if (activeOperationRef.current) {
        notify(`Дождитесь завершения операции «${activeOperationRef.current}».`, true)
        return null
      }

      activeOperationRef.current = label
      try {
        return await operation()
      } catch (error) {
        reportRendererError(`operation:${label}`, error)
        notify(`Операция «${label}» не выполнена: ${error?.message || error}`, true)
        return null
      } finally {
        activeOperationRef.current = ''
      }
    },
    [notify],
  )
}
