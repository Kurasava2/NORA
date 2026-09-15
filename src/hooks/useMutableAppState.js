import { useCallback } from 'react'
import { clone } from '../lib/domain.js'

export default function useMutableAppState(history) {
  return useCallback(
    stateUpdater => {
      history.commit(previousState => {
        const nextState = clone(previousState)
        stateUpdater(nextState)
        return nextState
      })
    },
    [history.commit],
  )
}
