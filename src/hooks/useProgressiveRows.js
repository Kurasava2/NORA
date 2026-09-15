import { useEffect, useState } from 'react'

export default function useProgressiveRows(rows, initialCount = 18, stepCount = 18) {
  const [visibleCount, setVisibleCount] = useState(() => Math.min(initialCount, rows.length))

  useEffect(() => {
    let cancelled = false
    let idleCallbackId = null
    let timeoutId = null

    setVisibleCount(Math.min(initialCount, rows.length))

    const renderNextChunk = () => {
      if (cancelled) return
      setVisibleCount(currentCount => {
        const nextCount = Math.min(rows.length, Math.max(currentCount, initialCount) + stepCount)
        if (nextCount < rows.length) scheduleNextChunk()
        return nextCount
      })
    }

    const scheduleNextChunk = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleCallbackId = window.requestIdleCallback(renderNextChunk, { timeout: 180 })
      } else {
        timeoutId = window.setTimeout(renderNextChunk, 24)
      }
    }

    if (rows.length > initialCount) scheduleNextChunk()

    return () => {
      cancelled = true
      if (idleCallbackId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleCallbackId)
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [rows, initialCount, stepCount])

  return rows.slice(0, Math.min(visibleCount, rows.length))
}
