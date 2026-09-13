export const loadTemplateEngine = () => import('./templateEngine.js')

export function reportRendererError(scope, error) {
  const detail = error?.stack || error?.message || String(error)
  try {
    const pending = window.desktopAPI?.logError?.(scope, detail)
    pending?.catch?.(() => {})
  } catch {}
}
