let templateEnginePromise = null

export function loadTemplateEngine() {
  if (!templateEnginePromise) {
    templateEnginePromise = Promise.all([
      import('./templateEngine.js'),
      import('./templatePreview.js')
    ]).then(([engine, preview]) => ({
      ...engine,
      renderHtml: (templateBytes, model, fullDocument = false) =>
        preview.renderHtml(engine.render, templateBytes, model, fullDocument)
    }))
  }
  return templateEnginePromise
}

export function reportRendererError(scope, error) {
  const detail = error?.stack || error?.message || String(error)
  try {
    const pending = window.desktopAPI?.logError?.(scope, detail)
    pending?.catch?.(() => {})
  } catch {}
}
