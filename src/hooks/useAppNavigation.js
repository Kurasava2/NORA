import { startTransition, useCallback, useState } from 'react'

export const HOME_VIEW = {
  name: 'home',
  periodId: null,
  statementId: null,
  vehicleId: null,
}

export default function useAppNavigation() {
  const [view, setView] = useState(HOME_VIEW)

  const navigate = useCallback(nextView => {
    startTransition(() => setView(nextView))
  }, [])

  const goHome = useCallback(() => navigate(HOME_VIEW), [navigate])

  const goPeriod = useCallback(
    periodId => navigate({ name: 'period', periodId, statementId: null, vehicleId: null }),
    [navigate],
  )

  const goStatement = useCallback(
    (periodId, statementId) =>
      navigate({ name: 'statement', periodId, statementId, vehicleId: null }),
    [navigate],
  )

  const goHistory = useCallback(
    vehicleId => navigate({ name: 'history', periodId: null, statementId: null, vehicleId }),
    [navigate],
  )

  const showPreview = useCallback(() => {
    setView(previousView => ({ ...previousView, name: 'preview' }))
  }, [])

  const leavePreview = useCallback(() => {
    setView(previousView => ({ ...previousView, name: 'statement' }))
  }, [])

  return {
    view,
    navigate,
    goHome,
    goPeriod,
    goStatement,
    goHistory,
    showPreview,
    leavePreview,
  }
}
