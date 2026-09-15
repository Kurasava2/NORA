import { useCallback, useEffect, useRef, useState } from 'react'

export default function useToast() {
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  const notify = useCallback((message, bad = false) => {
    setToast({ message, bad })
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => () => clearTimeout(toastTimerRef.current), [])

  return { toast, notify }
}
