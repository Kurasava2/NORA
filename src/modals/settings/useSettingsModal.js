import { useEffect, useState } from 'react'
import { toleranceOf } from '../../lib/domain.js'
import { loadTemplateEngine, reportRendererError } from '../../lib/runtime.js'

export default function useSettingsModal({ open, state, mutate, notify, confirmAction, onClose }) {
  const [form, setForm] = useState(state.settings)
  const [printers, setPrinters] = useState([])
  const [printersLoading, setPrintersLoading] = useState(false)
  const [template, setTemplate] = useState(null)

  async function refreshPrinters() {
    if (!window.desktopAPI?.isElectron) return
    setPrintersLoading(true)
    try {
      const printerList = await window.desktopAPI.listPrinters()
      setPrinters(Array.isArray(printerList) ? printerList : [])
    } catch (error) {
      reportRendererError('settings:printers', error)
      setPrinters([])
      notify(`Не удалось получить список принтеров: ${error?.message || error}`, true)
    } finally {
      setPrintersLoading(false)
    }
  }

  async function refreshTemplate() {
    if (!window.desktopAPI?.isElectron) return
    try {
      const templateResult = await window.desktopAPI.loadTemplate()
      if (!templateResult?.success || !templateResult.bytes) {
        setTemplate(null)
        if (templateResult?.error) notify(templateResult.error, true)
        return
      }

      try {
        const { inspect } = await loadTemplateEngine()
        const templateInfo = await inspect(new Uint8Array(templateResult.bytes))
        setTemplate({ name: templateResult.name, info: templateInfo })
      } catch (error) {
        reportRendererError('settings:templateInspect', error)
        setTemplate({ name: templateResult.name, info: null })
        notify(`Шаблон загружен, но не распознан: ${error?.message || error}`, true)
      }
    } catch (error) {
      reportRendererError('settings:templateLoad', error)
      setTemplate(null)
      notify(`Не удалось прочитать шаблон: ${error?.message || error}`, true)
    }
  }

  useEffect(() => {
    if (!open) return
    setForm(state.settings)
    refreshPrinters()
    refreshTemplate()
  }, [open])

  async function chooseTemplate() {
    try {
      const chooseResult = await window.desktopAPI.chooseTemplate()
      if (chooseResult?.success) {
        await refreshTemplate()
        notify('Excel-шаблон сохранён локально')
      } else if (!chooseResult?.canceled) {
        notify(chooseResult?.error || 'Не удалось загрузить шаблон', true)
      }
    } catch (error) {
      reportRendererError('settings:templateChoose', error)
      notify(`Не удалось загрузить шаблон: ${error?.message || error}`, true)
    }
  }

  async function removeTemplate() {
    if (!template) return
    const shouldRemove = await confirmAction({
      title: 'Удалить Excel-шаблон?',
      message: `Шаблон «${template.name}» будет удалён из приложения.`,
      confirmText: 'Удалить',
      danger: true,
    })
    if (!shouldRemove) return

    try {
      const removeResult = await window.desktopAPI.removeTemplate()
      if (!removeResult?.success) {
        throw new Error(removeResult?.error || 'Не удалось удалить шаблон')
      }
      setTemplate(null)
      notify('Шаблон удалён')
    } catch (error) {
      reportRendererError('settings:templateRemove', error)
      notify(`Не удалось удалить шаблон: ${error?.message || error}`, true)
    }
  }

  function saveSettings() {
    mutate(nextState => {
      nextState.settings = {
        ...nextState.settings,
        ...form,
        tolerance: toleranceOf(form.tolerance),
        autosave: form.autosave !== false,
        autosaveDelay: Number(form.autosaveDelay || 0),
        directPrint: Boolean(form.directPrint),
        performanceMode: form.performanceMode !== false,
      }
    })
    notify('Настройки сохранены')
    onClose()
  }

  return {
    form,
    setForm,
    printers,
    printersLoading,
    template,
    refreshPrinters,
    chooseTemplate,
    removeTemplate,
    saveSettings,
  }
}
