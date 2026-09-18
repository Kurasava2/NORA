import { useEffect } from 'react'

export default function useWindowCloseRequest(onCloseRequested) {
  useEffect(() => {
    const desktopApi = window.desktopAPI
    if (
      !desktopApi?.isElectron ||
      typeof desktopApi.onCloseRequested !== 'function'
    ) {
      return undefined
    }

    return desktopApi.onCloseRequested(() => {
      void onCloseRequested()
    })
  }, [onCloseRequested])
}
