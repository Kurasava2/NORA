import { useCallback, useRef, useState } from 'react'

export default function useConfirmation() {
  const [confirmDialog, setConfirmDialog] = useState(null)
  const confirmResolverRef = useRef(null)

  const confirmAction = useCallback(options => {
    return new Promise(resolve => {
      if (confirmResolverRef.current) confirmResolverRef.current(false)
      confirmResolverRef.current = resolve
      setConfirmDialog(typeof options === 'string' ? { message: options } : options)
    })
  }, [])

  const resolveConfirm = useCallback(result => {
    const resolve = confirmResolverRef.current
    confirmResolverRef.current = null
    setConfirmDialog(null)
    resolve?.(result)
  }, [])

  return { confirmDialog, confirmAction, resolveConfirm }
}
