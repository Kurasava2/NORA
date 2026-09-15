export async function loadTemplateBytes() {
  if (!window.desktopAPI?.isElectron) {
    throw new Error('Шаблон доступен только в настольной версии.')
  }

  const templateResult = await window.desktopAPI.loadTemplate()
  if (!templateResult?.success || !templateResult.bytes) {
    throw new Error(templateResult?.error || 'Сначала загрузите исходную Excel-книгу в настройках.')
  }

  return new Uint8Array(templateResult.bytes)
}
