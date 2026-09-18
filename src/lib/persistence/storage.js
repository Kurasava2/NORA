const LOCAL_STORAGE_KEYS = ['gsm_vedomosti_v12', 'gsm_vedomosti_v02', 'gsm_vedomosti_v01']
const CURRENT_STORAGE_KEY = LOCAL_STORAGE_KEYS[0]

export function isDesktopRuntime() {
  return Boolean(window.desktopAPI?.isElectron)
}

export async function loadPersistedState() {
  if (isDesktopRuntime()) {
    const loadResult = await window.desktopAPI.loadData()
    if (!loadResult?.success) {
      throw new Error(loadResult?.error || 'Не удалось прочитать локальную базу.')
    }
    return loadResult
  }

  const storedValue = LOCAL_STORAGE_KEYS.map(storageKey =>
    localStorage.getItem(storageKey),
  ).find(Boolean)
  return { success: true, data: storedValue ? JSON.parse(storedValue) : null }
}

export async function loadAppInfo() {
  if (!isDesktopRuntime()) return null
  return window.desktopAPI.getAppInfo()
}

export async function savePersistedState(state, options = {}) {
  if (isDesktopRuntime()) {
    const saveResult = await window.desktopAPI.saveData(state, options)
    if (!saveResult?.success) {
      throw new Error(saveResult?.error || 'Не удалось сохранить локальную базу.')
    }
    return saveResult
  }

  localStorage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(state))
  return { success: true }
}
