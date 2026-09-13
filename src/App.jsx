import React, { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  BASE_VEHICLES, DEFAULT_STATE, STORAGE_VERSION, addTripMaterial, buildOpening, clone, createStatement, fmtDate,
  kmfmt, materialCellName, materialDisplayName, migrateState, nfmt, nonZero,
  num, periodDisplayName, periodFleetRows, periodMonthName, periodName, periodYear, predecessorTrip, prefilledTrip,
  presetDates, reconcileCarryForward, safeFile, smartBalance, sortTrips, sortedPeriods, statementMaterialNames,
  statementStatus, syncStatementMaterials, totals, tripMaterialNames, uid, validateStatement,
  toleranceOf, vehicleHistory, vehicleOf
} from './lib/domain.js'
import { documentBodyHtml, printHtml, xlsxModel } from './lib/document.js'
import { basicTripErrors } from './lib/tripValidation.js'

const cx = (...a) => a.flat().filter(Boolean).join(' ')
const WEEKDAY_FMT = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: '2-digit', month: 'short' })
const loadTemplateEngine = () => import('./lib/templateEngine.js')
const toneClass = tone => ({ ok: 'badge-ok', warn: 'badge-warn', bad: 'badge-bad', neutral: 'badge-neutral', blue: 'badge-blue' }[tone] || 'badge-neutral')

function reportRendererError(scope, error) {
  const detail = error?.stack || error?.message || String(error)
  try {
    const pending = window.desktopAPI?.logError?.(scope, detail)
    pending?.catch?.(() => {})
  } catch {}
}

function Badge({ tone = 'neutral', children }) { return <span className={cx('badge', toneClass(tone))}>{children}</span> }
function Button({ children, primary, danger, ghost, small, icon, className, ...props }) {
  return <button className={cx('btn', primary && 'btn-primary', danger && 'btn-danger', ghost && 'btn-ghost', small && 'btn-small', icon && 'btn-icon', className)} {...props}>{children}</button>
}
function Card({ children, className = '', ...props }) { return <div className={cx('card', className)} {...props}>{children}</div> }
function Field({ label, hint, children, className = '' }) { return <label className={cx('field', className)}><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label> }

function Modal({ open, title, subtitle, onClose, children, wide = false, extraWide = false }) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement
    const focusable = () => [...(dialogRef.current?.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') || [])].filter(el => !el.hidden)
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current?.(); return }
      if (e.key !== 'Tab') return
      const items = focusable()
      if (!items.length) { e.preventDefault(); dialogRef.current?.focus(); return }
      const first = items[0], last = items[items.length - 1], active = document.activeElement
      if (e.shiftKey && (active === first || !dialogRef.current?.contains(active))) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (active === last || !dialogRef.current?.contains(active))) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    const frame = window.requestAnimationFrame(() => {
      if (!dialogRef.current?.contains(document.activeElement)) (focusable()[0] || dialogRef.current)?.focus()
    })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.cancelAnimationFrame(frame)
      if (previousFocus?.isConnected) previousFocus.focus?.()
    }
  }, [open])
  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose?.()}>
    <div ref={dialogRef} tabIndex={-1} className={cx('modal', wide && 'modal-wide', extraWide && 'modal-extra-wide')} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><Button ghost icon onClick={onClose} aria-label="Закрыть">✕</Button></div>
      {children}
    </div>
  </div>
}

function Kpi({ value, label, tone }) { return <div className={cx('kpi', tone && `kpi-${tone}`)}><b>{value}</b><span>{label}</span></div> }
function PageHead({ title, subtitle, actions }) { return <div className="page-head"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="toolbar">{actions}</div></div> }
function NavButton({ active, onClick, icon, label }) { return <button onClick={onClick} className={cx('nav-button', active && 'active')}><span>{icon}</span>{label}</button> }

function TitleBar({ appInfo, onClose }) {
  const api = window.desktopAPI
  const canControl = !!api?.isElectron
  const minimize = () => api?.minimizeWindow?.()
  const maximize = () => api?.maximizeWindow?.()
  const close = () => onClose ? onClose() : api?.closeWindow?.()
  return <header className="titlebar" onDoubleClick={e => { if (!e.target.closest('button')) maximize() }}>
    <div className="titlebar-brand">
      <div className="titlebar-mark">Г</div>
      <div className="titlebar-copy"><b>ГСМ Ведомости</b><span>{appInfo?.version ? `v${appInfo.version}` : 'desktop'}</span></div>
    </div>
    {canControl && <div className="window-controls">
      <button className="window-btn" onClick={minimize} title="Свернуть" aria-label="Свернуть">−</button>
      <button className="window-btn" onClick={maximize} title="Развернуть" aria-label="Развернуть">□</button>
      <button className="window-btn window-close" onClick={close} title="Закрыть" aria-label="Закрыть">×</button>
    </div>}
  </header>
}

function shiftIso(value, delta, min, max) {
  if (!value) return value
  const d = new Date(`${value}T12:00:00`)
  d.setDate(d.getDate() + delta)
  const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (min && next < min) return min
  if (max && next > max) return max
  return next
}
function DateControl({ value, onChange, min, max, large = false }) {
  const weekday = value ? WEEKDAY_FMT.format(new Date(`${value}T12:00:00`)) : 'дата не выбрана'
  return <div className={cx('date-control', large && 'date-control-lg')}>
    <Button type="button" icon small onClick={() => onChange(shiftIso(value, -1, min, max))} title="Предыдущий день">‹</Button>
    <div className="date-core"><input className={cx('input', large && 'input-lg')} type="date" value={value || ''} min={min} max={max} onChange={e => onChange(e.target.value)} /><small>{weekday}</small></div>
    <Button type="button" icon small onClick={() => onChange(shiftIso(value, 1, min, max))} title="Следующий день">›</Button>
  </div>
}

function groupPeriods(periods) {
  const groups = new Map()
  periods.forEach(p => {
    const y = periodYear(p) || 'Без года'
    if (!groups.has(y)) groups.set(y, [])
    groups.get(y).push(p)
  })
  return [...groups.entries()].sort((a, b) => Number(b[0]) - Number(a[0]))
}

function useProgressiveRows(rows, initial = 18, step = 18) {
  const [limit, setLimit] = useState(() => Math.min(initial, rows.length))
  useEffect(() => {
    let cancelled = false, idleId = null, timeoutId = null
    setLimit(Math.min(initial, rows.length))
    const pump = () => {
      if (cancelled) return
      setLimit(current => {
        const next = Math.min(rows.length, Math.max(current, initial) + step)
        if (next < rows.length) schedule()
        return next
      })
    }
    const schedule = () => {
      if (typeof window.requestIdleCallback === 'function') idleId = window.requestIdleCallback(pump, { timeout: 180 })
      else timeoutId = window.setTimeout(pump, 24)
    }
    if (rows.length > initial) schedule()
    return () => {
      cancelled = true
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId)
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [rows, initial, step])
  return rows.slice(0, Math.min(limit, rows.length))
}

export default function App() {
  const [state, setState] = useState(() => migrateState(DEFAULT_STATE))
  const [ready, setReady] = useState(false)
  const [view, setView] = useState({ name: 'home', periodId: null, statementId: null, vehicleId: null })
  const [periodModal, setPeriodModal] = useState(false)
  const [settingsModal, setSettingsModal] = useState(false)
  const [materialModal, setMaterialModal] = useState(false)
  const [toast, setToast] = useState(null)
  const [appInfo, setAppInfo] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const saveTimer = useRef(null)
  const toastTimer = useRef(null)
  const stateRef = useRef(state)
  const readyRef = useRef(ready)
  const loadErrorRef = useRef(loadError)
  const busyRef = useRef('')

  stateRef.current = state
  readyRef.current = ready
  loadErrorRef.current = loadError

  const notify = (message, bad = false) => {
    setToast({ message, bad })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  const runExclusive = async (label, operation) => {
    if (busyRef.current) {
      notify(`Дождитесь завершения операции «${busyRef.current}».`, true)
      return null
    }
    busyRef.current = label
    try {
      return await operation()
    } catch (error) {
      reportRendererError(`operation:${label}`, error)
      notify(`Операция «${label}» не выполнена: ${error?.message || error}`, true)
      return null
    } finally {
      busyRef.current = ''
    }
  }

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    ;(async () => {
      try {
        let loaded = null
        if (window.desktopAPI?.isElectron) {
          const result = await window.desktopAPI.loadData()
          setAppInfo(await window.desktopAPI.getAppInfo())
          if (!result?.success) throw new Error(result?.error || 'Не удалось прочитать локальную базу.')
          loaded = result.data
          if (result.recoveredFrom) {
            const source = result.recoveredFrom === 'backup' ? 'резервной копии базы' : 'временного файла незавершённого сохранения'
            notify(`База восстановлена из ${source}. Проверьте последние изменения.`, true)
          }
        } else {
          const raw = localStorage.getItem('gsm_vedomosti_v12') || localStorage.getItem('gsm_vedomosti_v02') || localStorage.getItem('gsm_vedomosti_v01')
          if (raw) loaded = JSON.parse(raw)
        }
        if (loaded) setState(migrateState(loaded))
        setLoadError('')
      } catch (error) {
        reportRendererError('startup:load', error)
        const message = error?.message || String(error)
        setLoadError(message)
        notify(`База не загружена: ${message}`, true)
      } finally {
        setReady(true)
      }
    })()
  }, [])


  useEffect(() => {
    if (!ready || loadError || state.settings.autosave === false) return
    clearTimeout(saveTimer.current)
    let idleId = null
    const save = async () => {
      try {
        if (window.desktopAPI?.isElectron) {
          const result = await window.desktopAPI.saveData(state)
          if (!result?.success) throw new Error(result?.error || 'Не удалось сохранить локальную базу.')
        } else {
          localStorage.setItem('gsm_vedomosti_v12', JSON.stringify(state))
        }
        setSaveError('')
      } catch (error) {
        reportRendererError('autosave', error)
        const message = error?.message || String(error)
        setSaveError(message)
        notify(`Автосохранение не выполнено: ${message}`, true)
      }
    }
    saveTimer.current = setTimeout(() => {
      if (typeof window.requestIdleCallback === 'function') idleId = window.requestIdleCallback(save, { timeout: 1800 })
      else save()
    }, Math.max(0, Number(state.settings.autosaveDelay) || 0))
    return () => {
      clearTimeout(saveTimer.current)
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId)
    }
  }, [state, ready, loadError])

  useEffect(() => {
    const api = window.desktopAPI
    if (!api?.isElectron || typeof api.saveDataSync !== 'function') return
    const flushBeforeClose = event => {
      if (!readyRef.current || loadErrorRef.current) return
      const result = api.saveDataSync(stateRef.current)
      if (!result?.success) {
        event.preventDefault()
        event.returnValue = false
        setSaveError(result?.error || 'Не удалось сохранить локальную базу перед закрытием.')
      }
    }
    window.addEventListener('beforeunload', flushBeforeClose)
    return () => window.removeEventListener('beforeunload', flushBeforeClose)
  }, [])


  const periods = useMemo(() => sortedPeriods(state), [state])
  const groupedPeriods = useMemo(() => groupPeriods(periods), [periods])
  const activePeriod = state.periods.find(p => p.id === view.periodId)
  const activeStatement = activePeriod?.statements?.find(s => s.id === view.statementId)
  const activeVehicle = activeStatement ? vehicleOf(state, activeStatement.vehicleId) : (view.vehicleId ? vehicleOf(state, view.vehicleId) : null)

  const mutate = fn => setState(prev => { const next = clone(prev); fn(next); return next })
  const navigate = next => startTransition(() => setView(next))
  const goHome = () => navigate({ name: 'home', periodId: null, statementId: null, vehicleId: null })
  const goPeriod = periodId => navigate({ name: 'period', periodId, statementId: null, vehicleId: null })
  const goStatement = (periodId, statementId) => navigate({ name: 'statement', periodId, statementId, vehicleId: null })
  const goHistory = vehicleId => navigate({ name: 'history', periodId: null, statementId: null, vehicleId })

  async function saveCurrent(showSuccess = true) {
    if (loadError) {
      notify('Сохранение заблокировано: сначала восстановите или сбросьте повреждённую базу.', true)
      return { success: false, error: loadError }
    }
    try {
      if (window.desktopAPI?.isElectron) {
        const result = await window.desktopAPI.saveData(stateRef.current)
        if (!result?.success) throw new Error(result?.error || 'Не удалось сохранить локальную базу.')
      } else {
        localStorage.setItem('gsm_vedomosti_v12', JSON.stringify(stateRef.current))
      }
      setSaveError('')
      if (showSuccess) notify('Данные сохранены')
      return { success: true }
    } catch (error) {
      reportRendererError('save:manual', error)
      const message = error?.message || String(error)
      setSaveError(message)
      notify(`Не удалось сохранить данные: ${message}`, true)
      return { success: false, error: message }
    }
  }

  async function closeApp() {
    const api = window.desktopAPI
    if (!api?.isElectron) return
    if (loadError) {
      if (window.confirm('Локальная база не была загружена. Закрыть приложение без сохранения?')) await api.closeWindow()
      return
    }
    const saved = await saveCurrent(false)
    if (saved.success) await api.closeWindow()
  }

  async function startFreshDatabase() {
    if (!window.confirm('Создать новую пустую базу? Повреждённый файл будет сохранён рядом как .corrupt-… для возможного ручного восстановления.')) return
    const fresh = migrateState(DEFAULT_STATE)
    try {
      if (window.desktopAPI?.isElectron) {
        const result = await window.desktopAPI.saveData(fresh)
        if (!result?.success) throw new Error(result?.error || 'Не удалось создать новую базу.')
      } else {
        localStorage.setItem('gsm_vedomosti_v12', JSON.stringify(fresh))
      }
      setState(fresh)
      setLoadError('')
      setSaveError('')
      goHome()
      notify('Создана новая пустая база')
    } catch (error) {
      reportRendererError('database:new', error)
      notify(`Не удалось создать новую базу: ${error?.message || error}`, true)
    }
  }

  async function exportBackup() {
    return runExclusive('резервное копирование', async () => {
        const name = `ГСМ_универсальная_копия_${new Date().toISOString().slice(0, 10)}.gsmbackup`
        if (window.desktopAPI?.isElectron) {
          const r = await window.desktopAPI.exportBackup(state, name)
          if (r?.success) notify('Универсальная резервная копия сохранена')
          else if (!r?.canceled) notify(r?.error || 'Ошибка сохранения', true)
        } else notify('Универсальная резервная копия доступна в настольной сборке.', true)

    })
  }

  async function importBackup() {
    return runExclusive('восстановление резервной копии', async () => {
        if (!window.desktopAPI?.isElectron) return notify('Импорт резервной копии доступен в настольной сборке.', true)
        const r = await window.desktopAPI.importBackup()
        if (r?.success) {
          const sourceSchema = Number(r.meta?.dataSchemaVersion ?? r.data?.version ?? 0)
          if (Number.isFinite(sourceSchema) && sourceSchema > STORAGE_VERSION) {
            notify(`Эта резервная копия создана более новой версией данных (схема ${sourceSchema}). Обновите приложение перед восстановлением.`, true)
            return
          }
        }
        if (r?.success && window.confirm('Заменить текущие данные данными из резервной копии?')) {
          try {
            const restored = migrateState(r.data)
            const saved = await window.desktopAPI.saveData(restored)
            if (!saved?.success) throw new Error(saved?.error || 'Не удалось записать восстановленную базу на диск.')
            setState(restored)
            setLoadError('')
            setSaveError('')
            goHome()
            notify('Резервная копия восстановлена')
          } catch (error) {
            reportRendererError('backup:restore', error)
            notify(`Резервную копию не удалось восстановить: ${error?.message || error}`, true)
          }
        } else if (!r?.canceled && !r?.success) notify(r?.error || 'Не удалось открыть копию', true)

    })
  }

  async function loadTemplateBytes() {
    if (!window.desktopAPI?.isElectron) throw new Error('Шаблон доступен только в настольной версии.')
    const r = await window.desktopAPI.loadTemplate()
    if (!r?.success || !r.bytes) throw new Error(r?.error || 'Сначала загрузите исходную Excel-книгу в настройках.')
    return new Uint8Array(r.bytes)
  }

  async function saveRenderedXlsx(bytes, filename) {
    const r = await window.desktopAPI.saveBinary(bytes, filename, [{ name: 'Excel', extensions: ['xlsx'] }])
    if (r?.success) notify('XLSX сохранён')
    else if (!r?.canceled) notify(r?.error || 'Ошибка сохранения XLSX', true)
  }

  async function exportStatement(p, st) {
    return runExclusive('экспорт ведомости', async () => {
        const v = vehicleOf(state, st.vehicleId); const check = validateStatement(state, st, p)
        if (check.errors.length && !window.confirm(`Найдено ${check.errors.length} ошибок. Экспортировать всё равно?`)) return
        try {
          const { render } = await loadTemplateEngine()
          const bytes = await render(await loadTemplateBytes(), xlsxModel(state, p, st, v))
          await saveRenderedXlsx(bytes, safeFile(`Ведомость_${v.shortNo}_${p.start}_${p.end}.xlsx`))
        } catch (e) { reportRendererError('xlsx:exportStatement', e); notify(e.message, true) }

    })
  }

  async function exportPeriod(p) {
    return runExclusive('экспорт периода', async () => {
        const errors = (p.statements || []).reduce((n, st) => n + validateStatement(state, st, p).errors.length, 0)
        if (errors && !window.confirm(`В периоде есть ${errors} ошибок. Экспортировать всё равно?`)) return
        try {
          const models = BASE_VEHICLES.map(base => {
            const v = vehicleOf(state, base.id)
            const st = (p.statements || []).find(s => s.vehicleId === base.id) || { id:`idle_${base.id}`, vehicleId:base.id, materials:[], trips:[], opening:{odo:null,gsm:{}} }
            return xlsxModel(state, p, st, v)
          })
          const { renderBook } = await loadTemplateEngine()
          const bytes = await renderBook(await loadTemplateBytes(), models)
          await saveRenderedXlsx(bytes, safeFile(`Ведомости_ГСМ_${periodMonthName(p)}_${periodYear(p)}.xlsx`))
        } catch (e) { reportRendererError('xlsx:exportPeriod', e); notify(e.message, true) }

    })
  }

  async function importMonthBook(file) {
    return runExclusive('импорт Excel', async () => {
        if (!file) return
        if (file.size > 64 * 1024 * 1024) return notify('Файл XLSX больше 64 МБ. Импорт заблокирован для защиты памяти 32-битной сборки.', true)
        try {
          const { importMonth } = await loadTemplateEngine()
          const result = await importMonth(await file.arrayBuffer(), BASE_VEHICLES, state.catalog)
          const pp = result.period
          if (state.periods.some(x => x.start === pp.start && x.end === pp.end) && !window.confirm(`Период ${fmtDate(pp.start)} — ${fmtDate(pp.end)} уже существует. Заменить его?`)) return
          const next = clone(state)
          next.periods = next.periods.filter(x => !(x.start === pp.start && x.end === pp.end))
          for (const name of result.unknownMaterials || []) if (!next.catalog.some(x => x.name === name)) next.catalog.push({id:`import_${uid()}`,name,category:/^Д[тТ](?=\s|$)/i.test(name)?'Топливо':'Масло',unit:'л',aliases:[name],sourceVehicles:[],sourceCount:0,active:true})
          const p = { id:uid(), reportMonth:pp.reportMonth, start:pp.start, end:pp.end, statements:[], importInfo:{file:file.name, importedAt:new Date().toISOString(), recognizedSheets:result.recognized, totalSheets:result.totalSheets, totalTrips:result.totalTrips, ignoredSheets:result.ignored} }
          next.periods.push(p)
          for (const raw of result.statements) {
            const v = vehicleOf(next, raw.vehicleId); if (!v) continue
            const st = createStatement(next, p, v)
            st.trips = raw.trips.map(t => ({...t,id:uid(),seq:Date.now()+Math.random(),gsm:Object.fromEntries(Object.entries(t.gsm||{}).map(([m,q])=>[m,{...q,_carried:false,_autoTarget:''}]))}))
            sortTrips(st); syncStatementMaterials(st); p.statements.push(st)
          }
          setState(migrateState(next)); goPeriod(p.id)
          notify(`Импортировано ${result.totalTrips} путёвок · ${result.statements.length} машин`)
        } catch (e) { reportRendererError('xlsx:importMonth', e); notify(`Ошибка импорта книги: ${e.message}`, true) }

    })
  }

  async function deletePeriod(periodId) {
    const p = state.periods.find(x=>x.id===periodId); if(!p) return
    if(!window.confirm(`Удалить период ${periodDisplayName(p)}?`)) return
    mutate(next => { next.periods = next.periods.filter(x=>x.id!==periodId) }); goHome()
  }
  async function deleteYear(year) {
    const count = state.periods.filter(p=>periodYear(p)===Number(year)).length
    if(!window.confirm(`Удалить ${year} год и все ${count} период(а)?`)) return
    mutate(next => { next.periods = next.periods.filter(p=>periodYear(p)!==Number(year)) }); goHome()
  }

  async function printStatement(p, st) {
    return runExclusive('печать', async () => {
        const v = vehicleOf(state, st.vehicleId); const check = validateStatement(state, st, p)
        if (check.errors.length && !window.confirm(`Найдено ${check.errors.length} ошибок. Печатать всё равно?`)) return
        if (!window.desktopAPI?.isElectron) return window.print()
        const direct = state.settings.directPrint && state.settings.preferredPrinter
        try {
          const r = await window.desktopAPI.printHtml(printHtml(state, p, st, v), { silent: !!direct, deviceName: direct ? state.settings.preferredPrinter : '' })
          if (r?.success) notify(direct ? 'Отправлено на принтер' : 'Печать завершена')
          else notify(r?.error || 'Ошибка печати', true)
        } catch (error) {
          reportRendererError('print', error)
          notify(`Ошибка печати: ${error?.message || error}`, true)
        }

    })
  }

  if (!ready) return <div className="loading"><div className="loader"/><b>ГСМ Ведомости</b><span>Загрузка локальной базы…</span></div>
  if (loadError) return <RecoveryScreen appInfo={appInfo} error={loadError} onRestore={importBackup} onReset={startFreshDatabase} onClose={() => window.desktopAPI?.closeWindow?.()} />

  return <div className={cx('desktop-root', state.settings.performanceMode !== false && 'performance-mode')}>
    <TitleBar appInfo={appInfo} onClose={closeApp} />
    <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">Г</div><div><b>Рабочая база</b><span>РАСЧЁТНЫЕ ВЕДОМОСТИ ГСМ</span></div></div>
      <nav className="main-nav">
        <NavButton active={view.name === 'home'} onClick={goHome} icon="⌂" label="Обзор периодов" />
        <NavButton active={view.name === 'vehicles' || view.name === 'history'} onClick={() => navigate({ name: 'vehicles' })} icon="▣" label="Автомобили" />
        <NavButton active={view.name === 'catalog'} onClick={() => navigate({ name: 'catalog' })} icon="◫" label="Справочник ГСМ" />
      </nav>

      <details className="period-tree" open>
        <summary><span>▾</span> Периоды</summary>
        <div className="period-tree-body">
          {groupedPeriods.map(([year, items]) => <details className="year-tree" key={year} defaultOpen={items.some(p => p.id === view.periodId)}>
            <summary><span>▾</span><b>{year}</b><small>{items.length}</small></summary>
            <div className="month-tree">{items.map(p => <button key={p.id} onClick={() => goPeriod(p.id)} className={cx('month-tree-item', view.periodId === p.id && ['period','statement','preview'].includes(view.name) && 'active')}>
              <b>{periodMonthName(p)}</b><span>{fmtDate(p.start)} — {fmtDate(p.end)}</span>
            </button>)}</div>
          </details>)}
          {!periods.length && <div className="side-empty">Периодов пока нет</div>}
        </div>
      </details>

      <div className="sidebar-spacer"/>
      <div className="side-caption">Сервис</div>
      <button className="side-link" onClick={() => setSettingsModal(true)}>⚙ Настройки и печать</button>
      <button className="side-link" onClick={() => saveCurrent(true)}>💾 Сохранить сейчас</button>
      <button className="side-link" onClick={exportBackup}>⇩ Универсальная резервная копия</button>
      <button className="side-link" onClick={importBackup}>⇧ Восстановить копию</button>
      <div className="app-meta"><span className={cx('status-dot', saveError && 'bad', state.settings.autosave===false && !saveError && 'off')}></span><div><b>{saveError?'Ошибка сохранения':state.settings.autosave===false?'Автосохранение выключено':'Автосохранение активно'}</b><span>{saveError || (state.settings.autosave===false?'Сохранение вручную или при выходе':appInfo?.version ? `Версия ${appInfo.version}` : 'React · Electron')}</span></div></div>
    </aside>

    <main className="main-content">
      {view.name === 'home' && <HomeView state={state} periods={periods} onNew={() => setPeriodModal(true)} onOpen={goPeriod} onImport={importMonthBook} onDeletePeriod={deletePeriod} onDeleteYear={deleteYear} />}
      {view.name === 'period' && activePeriod && <PeriodView state={state} period={activePeriod} mutate={mutate} onOpen={st => goStatement(activePeriod.id, st.id)} onExport={() => exportPeriod(activePeriod)} onHistory={goHistory} />}
      {view.name === 'statement' && activePeriod && activeStatement && activeVehicle && <StatementView state={state} period={activePeriod} statement={activeStatement} vehicle={activeVehicle} mutate={mutate} onBack={() => goPeriod(activePeriod.id)} onHistory={() => goHistory(activeVehicle.id)} onPreview={() => setView({ ...view, name: 'preview' })} onExport={() => exportStatement(activePeriod, activeStatement)} onPrint={() => printStatement(activePeriod, activeStatement)} notify={notify} />}
      {view.name === 'preview' && activePeriod && activeStatement && activeVehicle && <PreviewView state={state} period={activePeriod} statement={activeStatement} vehicle={activeVehicle} onBack={() => setView({ ...view, name: 'statement' })} onExport={() => exportStatement(activePeriod, activeStatement)} onPrint={() => printStatement(activePeriod, activeStatement)} />}
      {view.name === 'vehicles' && <VehiclesView state={state} onHistory={goHistory} />}
      {view.name === 'catalog' && <CatalogView state={state} mutate={mutate} onAdd={() => setMaterialModal(true)} notify={notify} />}
      {view.name === 'history' && activeVehicle && <HistoryView state={state} vehicle={activeVehicle} onBack={() => navigate({ name: 'vehicles' })} onOpen={(p, st) => goStatement(p.id, st.id)} />}
    </main>

    <PeriodModal open={periodModal} onClose={() => setPeriodModal(false)} state={state} mutate={mutate} onCreated={p => { setPeriodModal(false); goPeriod(p.id) }} />
    <SettingsModal open={settingsModal} onClose={() => setSettingsModal(false)} state={state} mutate={mutate} notify={notify} appInfo={appInfo} />
    <MaterialModal open={materialModal} onClose={() => setMaterialModal(false)} state={state} mutate={mutate} notify={notify} />
    {toast && <div className={cx('toast', toast.bad && 'toast-bad')}>{toast.message}</div>}
    </div>
  </div>
}

function HomeView({ state, periods, onNew, onOpen, onImport, onDeletePeriod, onDeleteYear }) {
  const inputRef = useRef(null)
  const summaries = useMemo(() => periods.map(p => {
    const rows = periodFleetRows(state, p)
    const errors = rows.reduce((n,r)=>n+(r.status.key==='bad'?1:0),0)
    const drove = rows.reduce((n,r)=>n+(r.stats.trips>0?1:0),0)
    return { id:p.id, rows, errors, drove, stood:BASE_VEHICLES.length-drove }
  }), [state, periods])
  const summaryById = useMemo(() => new Map(summaries.map(x=>[x.id,x])), [summaries])
  const {road,idle,bad} = useMemo(() => summaries.reduce((a,x) => {
    for(const r of x.rows){if(r.status.key==='idle')a.idle++;else a.road++;if(r.status.key==='bad')a.bad++}
    return a
  }, {road:0,idle:0,bad:0}), [summaries])
  const groups = useMemo(() => groupPeriods(periods), [periods])
  return <div className="page"><PageHead title="Расчётные периоды" subtitle={`${BASE_VEHICLES.length} машин · ${state.catalog.length} типов ГСМ · локальная база`} actions={<><input ref={inputRef} className="hidden-input" type="file" accept=".xlsx,.xlsm" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)onImport(f)}}/><Button onClick={()=>inputRef.current?.click()}>⇧ Создать месяц из книги</Button><Button primary onClick={onNew}>＋ Новый период</Button></>} />
    <div className="kpi-grid"><Kpi value={periods.length} label="месяцев"/><Kpi value={road} label="машино-месяцев с путёвками"/><Kpi value={idle} label="машино-месяцев без выезда" tone="ok"/><Kpi value={bad} label="с ошибками" tone={bad ? 'bad' : undefined}/><Kpi value={BASE_VEHICLES.length} label="машин в справочнике"/></div>
    {groups.length ? <div className="year-sections">{groups.map(([year, items]) => <section className="year-section" key={year}><div className="year-heading"><span>{year}</span><small>{items.length} мес.</small><Button small danger onClick={()=>onDeleteYear(year)}>Удалить год</Button></div><div className="card-grid-2">{items.map(p => {
      const { errors, drove, stood } = summaryById.get(p.id)
      return <Card key={p.id} className="period-card"><div className={cx('period-accent', errors && 'bad')}></div><div className="row clickable period-card-main" onClick={() => onOpen(p.id)}><div><h3>{periodMonthName(p)}</h3><p>{fmtDate(p.start)} — {fmtDate(p.end)}</p></div>{errors ? <Badge tone="bad">{errors} с ошибками</Badge> : <Badge tone="ok">проверено</Badge>}</div><div className="period-card-stats"><span><b>{drove}</b> ездили</span><span><b>{stood}</b> не ездили</span><div className="period-card-actions"><Button small danger onClick={()=>onDeletePeriod(p.id)}>Удалить</Button></div></div></Card>
    })}</div></section>)}</div> : <Empty title="Создайте первый расчётный период" text="Периоды будут сгруппированы по годам и месяцам. Можно создать вручную или импортировать готовую Excel-книгу." action={<div className="toolbar"><Button onClick={()=>inputRef.current?.click()}>Импортировать книгу</Button><Button primary onClick={onNew}>Создать период</Button></div>} />}
  </div>
}

function PeriodView({ state, period, mutate, onOpen, onExport, onHistory }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const deferredQuery = useDeferredValue(query)
  const rows = useMemo(() => periodFleetRows(state, period), [state, period])
  const visible = useMemo(() => rows.filter(r => {
    const q = deferredQuery.toLowerCase().trim(); const match = !q || `${r.vehicle.shortNo} ${r.vehicle.model} ${r.vehicle.reg}`.toLowerCase().includes(q)
    return match && (filter === 'all' || r.status.key === filter)
  }), [rows, deferredQuery, filter])
  const counts = useMemo(() => rows.reduce((o, r) => { o[r.status.key] = (o[r.status.key] || 0) + 1; return o }, {}), [rows])
  const renderedRows = useProgressiveRows(visible, 18, 18)
  const openVehicle = vehicle => {
    const existing = (period.statements || []).find(s => s.vehicleId === vehicle.id)
    if (existing) return onOpen(existing)
    const st = createStatement(state, period, vehicleOf(state, vehicle.id))
    mutate(next => {
      const p = next.periods.find(x => x.id === period.id)
      if (!p.statements.some(s => s.vehicleId === vehicle.id)) p.statements.push(clone(st))
    })
    onOpen(st)
  }
  return <div className="page"><PageHead title={periodMonthName(period)} subtitle={`${periodYear(period)} · ${fmtDate(period.start)} — ${fmtDate(period.end)} · контроль автопарка`} actions={<Button onClick={onExport}>Экспорт периода XLSX</Button>} />
    <div className="kpi-grid"><Kpi value={counts.ok || 0} label="готово" tone="ok"/><Kpi value={counts.warn || 0} label="с замечаниями"/><Kpi value={counts.bad || 0} label="с ошибками" tone={(counts.bad || 0) ? 'bad' : undefined}/><Kpi value={counts.idle || 0} label="не ездили" tone="ok"/><Kpi value={BASE_VEHICLES.length} label="всего машин"/></div>
    <Card><div className="filters"><input className="input search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск по номеру, модели или рег. номеру…"/><select className="select" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Все статусы</option><option value="idle">Не ездили</option><option value="bad">Ошибки</option><option value="warn">Замечания</option><option value="ok">Готово</option></select></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Машина</th><th>Модель</th><th>Рег. №</th><th>Статус</th><th>Путёвок</th><th>Пробег</th><th>Топливо</th><th></th></tr></thead><tbody>{renderedRows.map(r => <tr key={r.vehicle.id} className="hover-row"><td><b className="mono-lg">{r.vehicle.shortNo}</b></td><td>{r.vehicle.model}</td><td>{r.vehicle.reg}</td><td><Badge tone={r.status.tone}>{r.status.label}</Badge></td><td className="num">{r.stats.trips}</td><td className="num">{kmfmt(r.stats.km)} км</td><td className="num">{nfmt(r.stats.fuel)} л</td><td className="actions"><Button small onClick={() => onHistory(r.vehicle.id)}>История</Button><Button small primary icon onClick={() => openVehicle(r.vehicle)} title="Открыть ведомость" aria-label="Открыть ведомость">✎</Button></td></tr>)}</tbody></table></div>
    </Card>
  </div>
}

function StatementView({ state, period, statement, vehicle, mutate, onBack, onHistory, onPreview, onExport, onPrint, notify }) {
  const [editor, setEditor] = useState({ open: false, trip: null })
  const status = useMemo(() => statementStatus(state, statement, period), [state, statement, period])
  const total = useMemo(() => totals(statement), [statement])
  const refreshCarry = () => mutate(next => {
    const p = next.periods.find(x=>x.id===period.id); const st = p.statements.find(x=>x.id===statement.id); st.opening = buildOpening(next, st.vehicleId, p); reconcileCarryForward(next, st)
  })
  const deleteTripFromList = trip => {
    if (!window.confirm(`Удалить путёвку №${trip.number || '—'} от ${fmtDate(trip.date)}?`)) return
    mutate(next => {
      const p = next.periods.find(x=>x.id===period.id)
      const st = p.statements.find(x=>x.id===statement.id)
      st.trips = st.trips.filter(t=>t.id!==trip.id)
      reconcileCarryForward(next,st)
    })
    notify('Путёвка удалена')
  }

  return <div className="page page-wide"><PageHead title={`${vehicle.model} · ${vehicle.shortNo}`} subtitle={`№ ${vehicle.reg} · ${periodMonthName(period)} ${periodYear(period)} · ${periodName(period)}`} actions={<><Button onClick={onBack}>← К месяцу</Button><Button onClick={onHistory}>История</Button><Button onClick={onPreview}>Предпросмотр</Button><Button onClick={onExport}>XLSX</Button><Button primary onClick={onPrint}>Печать</Button></>} />
    <div className="statement-strip"><div><span>Статус</span><Badge tone={status.tone}>{status.label}</Badge></div><div><span>Норма</span><b>{vehicle.baseRate ? `${nfmt(vehicle.baseRate)} л/100 км` : 'по документу'}</b></div><div><span>Бак</span><b>{vehicle.tankCapacity ? `${nfmt(vehicle.tankCapacity)} л` : '—'}</b></div><div className="grow"><span>ГСМ в путёвках</span><div className="chip-row">{statementMaterialNames(statement).map(m => <span className="chip" key={m}>{materialDisplayName(m)}</span>)}</div></div></div>

    <div className="workspace"><div className="workspace-main">
      <Card><div className="section-heading"><div><h3>Внесённые путёвки</h3><p>Нажмите строку, чтобы отредактировать. Новая путёвка открывается отдельным окном.</p></div><div className="section-actions"><Badge tone="blue">{statement.trips.length} шт.</Badge><Button primary onClick={() => setEditor({ open: true, trip: null })}>＋ Добавить путёвку</Button></div></div><TripTable state={state} period={period} statement={statement} vehicle={vehicle} onEdit={trip => setEditor({ open: true, trip })} onDelete={deleteTripFromList}/></Card>
    </div><aside className="workspace-side"><CheckPanel status={status}/><CarryPanel statement={statement} onRefresh={refreshCarry}/><BalancePanel state={state} statement={statement} total={total}/></aside></div>

    <TripModal open={editor.open} trip={editor.trip} onClose={() => setEditor({ open: false, trip: null })} state={state} period={period} statement={statement} vehicle={vehicle} mutate={mutate} notify={notify}/>
  </div>
}

function TripModal({ open, trip, onClose, state, period, statement, vehicle, mutate, notify }) {
  const editingId = trip?.id || null
  const [form, setForm] = useState(() => prefilledTrip(state, statement, period, trip))
  const [materialPick, setMaterialPick] = useState('')
  const [errors, setErrors] = useState([])
  const [initialSnapshot, setInitialSnapshot] = useState('')
  useEffect(() => { if (open) { const initial = prefilledTrip(state, statement, period, trip); setForm(initial); setInitialSnapshot(JSON.stringify(initial)); setMaterialPick(''); setErrors([]) } }, [open, editingId])
  useEffect(() => { if (!open) return; const handler=e=>{if(e.ctrlKey&&e.key==='Enter'){e.preventDefault();document.getElementById('trip-submit')?.click()}}; window.addEventListener('keydown',handler); return()=>window.removeEventListener('keydown',handler)}, [open])

  const setTripField=(field,value)=>setForm(f=>({...f,[field]:value}))
  const setGsm=(m,field,value)=>setForm(f=>{
    const q={...(f.gsm?.[m]||{start:'',received:'',spent:'',end:'',_autoTarget:'',_carried:false}),[field]:value}
    if(field==='start')q._carried=false
    let target=q._autoTarget||''
    if(field===target){ target=''; q._autoTarget='' }
    else if(target){ Object.assign(q,smartBalance(q,target)) }
    if(!q._autoTarget){ const fields=['start','received','spent','end'], empty=fields.filter(k=>String(q[k]??'').trim()===''); if(empty.length===1&&empty[0]!==field){ q._autoTarget=empty[0]; Object.assign(q,smartBalance(q,empty[0])) } }
    return {...f,gsm:{...f.gsm,[m]:q}}
  })
  const km=num(form.odoStart)!==null&&num(form.odoEnd)!==null?num(form.odoEnd)-num(form.odoStart):null
  const addMaterial=()=>{if(!materialPick)return;setForm(f=>addTripMaterial(state,statement,{...f,gsm:{...(f.gsm||{})}},materialPick,editingId));setMaterialPick('')}
  const removeMaterial=m=>setForm(f=>{const gsm={...(f.gsm||{})};delete gsm[m];return{...f,gsm}})
  const available=useMemo(()=>state.catalog.filter(m=>!form.gsm?.[m.name]).sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name)),[state.catalog,form.gsm])

  const requiredErrors=out=>{const e=basicTripErrors(out,{period,hasMotohours:!!vehicle.hasMotohours,materialLabel:materialDisplayName}).map(x=>x.replace(/^Не указана дата\.$/,'Укажите дату.').replace(/^Не указан номер путёвки\.$/,'Укажите номер путёвки.'));const number=String(out.number||'').trim();if(number&&statement.trips.some(t=>t.id!==editingId&&String(t.number||'').trim()===number))e.push('Такой номер путёвки уже есть в этой ведомости.');const prev=editingId?predecessorTrip(statement,editingId):predecessorTrip(statement),source=prev?(prev.gsm||{}):(statement.opening?.gsm||{});for(const [m,q] of Object.entries(source)){const end=prev?num(q?.end):num(q);if(end!==null&&nonZero(state,end)&&!out.gsm?.[m])e.push(`Перенесите остаток ${materialDisplayName(m)}: ${nfmt(end)} л.`)}return e}
  const requestClose=()=>{const dirty=initialSnapshot&&JSON.stringify(form)!==initialSnapshot;if(dirty&&!window.confirm('Отменить несохранённые изменения путёвки?'))return;onClose()}
  const saveTrip=e=>{e.preventDefault();const out=clone(form);out.number=String(out.number||'').trim();out.note=String(out.note||'').trim();const e2=requiredErrors(out);if(e2.length){setErrors(e2);return}out.id=editingId||uid();out.seq=editingId?(statement.trips.find(t=>t.id===editingId)?.seq||Date.now()):(out.seq||Date.now()+Math.random());mutate(next=>{const st=next.periods.find(p=>p.id===period.id).statements.find(s=>s.id===statement.id);if(editingId){const ix=st.trips.findIndex(t=>t.id===editingId);if(ix>=0)st.trips[ix]=out}else st.trips.push(out);sortTrips(st);reconcileCarryForward(next,st)});notify(editingId?'Путёвка обновлена':'Путёвка добавлена');onClose()}
  const deleteTrip=()=>{if(!editingId||!window.confirm('Удалить эту путёвку?'))return;mutate(next=>{const st=next.periods.find(p=>p.id===period.id).statements.find(s=>s.id===statement.id);st.trips=st.trips.filter(t=>t.id!==editingId);reconcileCarryForward(next,st)});notify('Путёвка удалена');onClose()}

  return <Modal open={open} onClose={requestClose} extraWide title={editingId?`Путёвка №${trip?.number||'—'}`:'Новая путёвка'} subtitle={`${vehicle.model} · ${vehicle.shortNo} · ${periodMonthName(period)} ${periodYear(period)}`}><form onSubmit={saveTrip} className="trip-modal-form">
    <div className="trip-modal-body">{errors.length>0&&<div className="form-errors"><b>Путёвку нельзя сохранить:</b>{errors.map((x,i)=><div key={i}>• {x}</div>)}</div>}
      <SectionStep no="1" title="Путевой лист" subtitle="дата, номер и статус"><div className="grid-3"><Field label="Дата"><DateControl large value={form.date||''} min={period.start} max={period.end} onChange={v=>setTripField('date',v)}/></Field><Field label="Номер путёвки"><input className="input input-lg" value={form.number||''} onChange={e=>setTripField('number',e.target.value)} autoFocus/></Field><label className="check-card"><input type="checkbox" checked={!!form.unused} onChange={e=>setForm(f=>({...f,unused:e.target.checked,note:e.target.checked&&!f.note?'неиспользованный':f.note}))}/><span><b>Неиспользованная</b><small>Нули автоматически не подставляются</small></span></label></div></SectionStep>
      <SectionStep no="2" title="Одометр" subtitle="показания без разделителей тысяч"><div className="odo-grid"><Field label="Перед выездом"><input className="input input-number-xl" inputMode="decimal" value={form.odoStart??''} onChange={e=>setTripField('odoStart',e.target.value)}/></Field><Field label="После выезда"><input className="input input-number-xl" inputMode="decimal" value={form.odoEnd??''} onChange={e=>setTripField('odoEnd',e.target.value)}/></Field><div className={cx('km-live',km!==null&&km<0&&'bad')}><span>Пройдено</span><b>{km===null?'—':kmfmt(km)}</b><small>км</small></div>{vehicle.hasMotohours&&<Field label="Моточасы"><input className="input input-number-xl" value={form.motohours??''} onChange={e=>setTripField('motohours',e.target.value)}/></Field>}</div></SectionStep>
      <SectionStep no="3" title="ГСМ и масла" subtitle="тип выбирается в самой путёвке"><div className="inline-add"><select className="select grow" value={materialPick} onChange={e=>setMaterialPick(e.target.value)}><option value="">Выберите тип ГСМ / масла…</option>{available.map(m=><option key={m.name} value={m.name}>{m.category} — {materialDisplayName(m.name)}</option>)}</select><Button type="button" onClick={addMaterial} disabled={!materialPick}>＋ Добавить</Button></div><div className="material-rows">{tripMaterialNames(form).map(m=><MaterialEntry key={m} name={m} entry={form.gsm[m]} onChange={(f,v)=>setGsm(m,f,v)} onRemove={()=>removeMaterial(m)} tolerance={state.settings.tolerance}/>)}</div></SectionStep>
      <SectionStep no="4" title="Примечание" subtitle="необязательно"><textarea className="textarea" value={form.note||''} onChange={e=>setTripField('note',e.target.value)}/></SectionStep>
    </div><div className="modal-actions sticky-actions">{editingId?<Button type="button" danger onClick={deleteTrip}>Удалить</Button>:<span/>}<div className="action-cluster"><span className="shortcut">Ctrl + Enter</span><Button type="button" onClick={requestClose}>Отмена</Button><Button id="trip-submit" primary type="submit">{editingId?'Сохранить изменения':'Сохранить путёвку'}</Button></div></div>
  </form></Modal>
}
function SectionStep({no,title,subtitle,children}){return <section className="entry-step"><div className="step-title"><span>{no}</span><div><b>{title}</b><small>{subtitle}</small></div></div>{children}</section>}
function MaterialEntry({name,entry,onChange,onRemove,tolerance}){const vals=['start','received','spent','end'].map(k=>num(entry?.[k])),diff=vals.every(v=>v!==null)?vals[0]+vals[1]-vals[2]-vals[3]:null,ok=diff!==null&&Math.abs(diff)<=toleranceOf(tolerance);return <div className="material-entry"><div className="material-name"><b>{materialDisplayName(name)}</b><span>{ok?'✓ баланс':diff===null?'заполните значения':`расхождение ${nfmt(diff)} л`}</span><Button type="button" small danger onClick={onRemove}>Удалить</Button></div><div className="material-fields"><Field label="До"><input className="input num-input" value={entry?.start??''} onChange={e=>onChange('start',e.target.value)}/></Field><span className="math">+</span><Field label="Получено"><input className="input num-input" value={entry?.received??''} onChange={e=>onChange('received',e.target.value)}/></Field><span className="math">−</span><Field label="Расход"><input className="input num-input" value={entry?.spent??''} onChange={e=>onChange('spent',e.target.value)}/></Field><span className="math">=</span><Field label="После"><input className={cx('input num-input',entry?._autoTarget==='end'&&'auto-field')} value={entry?.end??''} onChange={e=>onChange('end',e.target.value)}/></Field></div><div className={cx('balance-line',diff===null?'neutral':ok?'ok':'bad')}>{diff===null?'Заполните любые три поля — четвёртое будет пересчитываться автоматически.':ok?'Баланс сходится.':'Проверьте значения.'}</div></div>}

function TripTable({ state, period, statement, vehicle, onEdit, onDelete }) {
  if (!statement.trips.length) return <Empty compact title="Машина не выезжала" text="Путёвок нет — ведомость считается обработанной как машина без выезда."/>
  const allErrors=validateStatement(state,statement,period).errors
  return <div className="table-wrap"><table className="data-table trips-table"><thead><tr><th>Дата</th><th>№</th><th>Одометр до</th><th>После</th><th>Км</th>{vehicle.hasMotohours&&<th>М/ч</th>}<th>ГСМ: расход / остаток</th><th>Примечание</th><th></th></tr></thead><tbody>{statement.trips.map(t=>{const prefix=`Путёвка №${t.number||'?'} (${fmtDate(t.date)})`,errs=allErrors.filter(e=>e.startsWith(prefix)),a=num(t.odoStart),b=num(t.odoEnd),gsm=tripMaterialNames(t).map(m=>{const q=t.gsm?.[m]||{},spent=num(q.spent),end=num(q.end),parts=[];if(spent!==null&&nonZero(state,spent))parts.push(`−${nfmt(spent)}`);if(end!==null&&nonZero(state,end))parts.push(`ост. ${nfmt(end)}`);return parts.length?<span key={m}><b>{materialCellName(m)}</b> {parts.join(' / ')}</span>:null}).filter(Boolean);return <tr key={t.id} className={cx('clickable hover-row',errs.length&&'row-bad',t.unused&&'row-unused')} onClick={()=>onEdit(t)}><td><b>{fmtDate(t.date)}</b></td><td><b>{t.number}</b>{t.unused&&<Badge>неисп.</Badge>}</td><td className="num">{kmfmt(t.odoStart)}</td><td className="num">{kmfmt(t.odoEnd)}</td><td className="num"><b>{a!==null&&b!==null?kmfmt(b-a):'—'}</b></td>{vehicle.hasMotohours&&<td className="num">{nfmt(t.motohours)}</td>}<td><div className="trip-gsm">{gsm}</div></td><td>{t.note||'—'}</td><td className="actions">{errs.length?<Badge tone="bad">{errs.length}</Badge>:<Badge tone="ok">✓</Badge>}<Button small danger onClick={e=>{e.stopPropagation();onDelete(t)}}>× Удалить</Button></td></tr>})}</tbody></table></div>
}
function BalancePanel({ state, statement, total }) { const mats=statementMaterialNames(statement); return <Card className="side-card"><h3>Итоги месяца</h3>{mats.length?mats.map(m=><div className="total-block" key={m}><b>{materialDisplayName(m)}</b><div><span>Начало</span><strong>{nfmt(total[m]?.start)} л</strong></div><div><span>Получено</span><strong>{nfmt(total[m]?.received)} л</strong></div><div><span>Расход</span><strong>{nfmt(total[m]?.spent)} л</strong></div><div><span>Остаток</span><strong>{nfmt(total[m]?.end)} л</strong></div></div>):<span className="muted">Нет ГСМ</span>}</Card> }

function CheckPanel({ status }) { return <Card className="side-card"><div className="side-card-head"><h3>Проверка</h3><Badge tone={status.tone}>{status.label}</Badge></div>{status.check.errors.length>0&&<div className="check-list bad"><b>Ошибки</b>{status.check.errors.slice(0,6).map((e,i)=><span key={i}>{e}</span>)}{status.check.errors.length>6&&<small>+ ещё {status.check.errors.length-6}</small>}</div>}{status.check.warnings.length>0&&<div className="check-list warn"><b>Замечания</b>{status.check.warnings.slice(0,5).map((e,i)=><span key={i}>{e}</span>)}</div>}{!status.check.errors.length&&!status.check.warnings.length&&<div className="all-good">✓ Контроль пройден</div>}</Card> }
function CarryPanel({ statement, onRefresh }) { return <Card className="side-card"><div className="side-card-head"><h3>Перенос</h3><Button small onClick={onRefresh}>Обновить</Button></div>{statement.opening?<><p className="muted">Из периода {statement.opening.sourceLabel}</p><div className="carry-value"><span>Одометр</span><b>{kmfmt(statement.opening.odo)}</b></div>{Object.entries(statement.opening.gsm||{}).map(([m,v])=><div className="carry-value" key={m}><span>{materialDisplayName(m)}</span><b>{nfmt(v)} л</b></div>)}{statement.opening.sourceHasErrors&&<div className="mini-warning">В исходной ведомости есть ошибки.</div>}</>:<p className="muted">Предыдущая заполненная ведомость этой машины не найдена.</p>}</Card> }

function PreviewView({ state, period, statement, vehicle, onBack, onExport, onPrint }) {
  return <div className="page page-wide"><PageHead title="Предпросмотр ведомости" subtitle={`${vehicle.model} · ${vehicle.shortNo}`} actions={<><Button onClick={onBack}>← Назад</Button><Button onClick={onExport}>XLSX</Button><Button primary onClick={onPrint}>Печать</Button></>} /><div className="paper-preview" dangerouslySetInnerHTML={{__html:documentBodyHtml(state,period,statement,vehicle)}}/></div>
}

function VehiclesView({ state, onHistory }) {
  const [q,setQ]=useState('')
  const deferredQ=useDeferredValue(q)
  const allRows=useMemo(()=>BASE_VEHICLES.map(v=>vehicleOf(state,v.id)),[state.vehicleSettings])
  const rows=useMemo(()=>{const needle=deferredQ.toLowerCase().trim();return needle?allRows.filter(v=>`${v.shortNo} ${v.model} ${v.reg}`.toLowerCase().includes(needle)):allRows},[allRows,deferredQ])
  const renderedRows=useProgressiveRows(rows,20,20)
  return <div className="page"><PageHead title="Автомобили" subtitle={`${BASE_VEHICLES.length} машин из исходного файла`} /><Card><div className="filters"><input className="input search" placeholder="Поиск машины…" value={q} onChange={e=>setQ(e.target.value)}/></div><div className="table-wrap"><table className="data-table vehicle-table"><thead><tr><th>№</th><th>Модель</th><th>Рег. №</th><th>Норма</th><th>Бак</th><th>ГСМ</th><th></th></tr></thead><tbody>{renderedRows.map(v=><tr key={v.id}><td><b className="mono-lg">{v.shortNo}</b></td><td>{v.model}</td><td>{v.reg}</td><td>{v.baseRate?nfmt(v.baseRate)+' л/100 км':'—'}</td><td>{v.tankCapacity?nfmt(v.tankCapacity)+' л':'—'}</td><td className="muted">выбирается в путёвке</td><td className="actions"><Button small onClick={()=>onHistory(v.id)}>История</Button></td></tr>)}</tbody></table></div></Card></div>
}

function CatalogView({ state, mutate, onAdd, notify }) {
  const fuels=useMemo(()=>state.catalog.filter(m=>m.category==='Топливо').length,[state.catalog]),oils=state.catalog.length-fuels
  const usage=useMemo(()=>{const map=new Map();for(const p of state.periods)for(const st of p.statements||[])for(const t of st.trips||[])for(const name of Object.keys(t.gsm||{}))map.set(name,(map.get(name)||0)+1);return map},[state.periods])
  const usesCount=name=>usage.get(name)||0
  const del=name=>{if(usesCount(name))return notify('Тип уже используется в сохранённых путёвках.',true);if(window.confirm(`Удалить «${name}»?`))mutate(next=>{next.catalog=next.catalog.filter(x=>x.name!==name)})}
  return <div className="page"><PageHead title="Справочник ГСМ" subtitle="Тип выбирается в конкретной путёвке" actions={<Button primary onClick={onAdd}>＋ Новый тип</Button>} /><div className="chip-row summary-chips"><Badge tone="blue">{fuels} видов топлива</Badge><Badge>{oils} видов масла</Badge><Badge tone="ok">{state.catalog.length} всего</Badge></div><Card><div className="table-wrap"><table className="data-table"><thead><tr><th>Категория</th><th>Наименование</th><th>Алиасы</th><th>Используется в путёвках</th><th></th></tr></thead><tbody>{[...state.catalog].sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name)).map(m=><tr key={m.id||m.name}><td><Badge tone={m.category==='Топливо'?'blue':'neutral'}>{m.category}</Badge></td><td><b>{materialDisplayName(m.name)}</b></td><td><div className="chip-row">{(m.aliases||[]).map(a=><span className="chip subtle" key={a}>{a}</span>)}</div></td><td className="num">{usesCount(m.name)}</td><td>{m.sourceCount?<span className="muted">из исходника</span>:<Button small danger onClick={()=>del(m.name)}>Удалить</Button>}</td></tr>)}</tbody></table></div></Card></div>
}

function HistoryView({ state, vehicle, onBack, onOpen }) {
  const rows=useMemo(()=>vehicleHistory(state,vehicle.id),[state,vehicle.id]), totalTrips=useMemo(()=>rows.reduce((s,x)=>s+x.stats.trips,0),[rows]), totalKm=useMemo(()=>rows.reduce((s,x)=>s+x.stats.km,0),[rows]), fuel=useMemo(()=>rows.reduce((s,x)=>s+x.stats.fuel,0),[rows]), latest=useMemo(()=>rows.find(x=>x.statement.trips?.length),[rows])
  return <div className="page"><PageHead title={`История · ${vehicle.shortNo}`} subtitle={`${vehicle.model} · №${vehicle.reg}`} actions={<Button onClick={onBack}>← Автомобили</Button>} /><div className="kpi-grid"><Kpi value={rows.length} label="периодов"/><Kpi value={totalTrips} label="путёвок"/><Kpi value={kmfmt(totalKm)} label="км всего"/><Kpi value={nfmt(fuel)} label="л топлива"/><Kpi value={latest?kmfmt(latest.statement.trips.at(-1).odoEnd):'—'} label="последний одометр"/></div><Card><div className="section-heading"><div><h3>Помесячная история</h3><p>Можно открыть источник любого переноса.</p></div></div>{rows.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>Месяц</th><th>Период</th><th>Статус</th><th>Путёвок</th><th>Пробег</th><th>Топливо</th><th>Конечные остатки</th><th></th></tr></thead><tbody>{rows.map(x=><tr key={x.period.id} className="hover-row"><td><b>{periodMonthName(x.period)} {periodYear(x.period)}</b></td><td>{periodName(x.period)}</td><td><Badge tone={x.status.tone}>{x.status.label}</Badge></td><td className="num">{x.stats.trips}</td><td className="num">{kmfmt(x.stats.km)} км</td><td className="num">{nfmt(x.stats.fuel)} л</td><td>{Object.entries(x.balances).map(([m,n])=><div key={m}>{materialDisplayName(m)}: <b>{nfmt(n)}</b></div>)}</td><td><Button small primary onClick={()=>onOpen(x.period,x.statement)}>Открыть</Button></td></tr>)}</tbody></table></div>:<Empty compact title="История пока пуста" text="Для этой машины ещё не создавались ведомости."/>}</Card></div>
}

function PeriodModal({ open, onClose, state, mutate, onCreated }) {
  const now=new Date(), current=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const [month,setMonth]=useState(current),[preset,setPreset]=useState('21'),[dates,setDates]=useState(()=>presetDates(current,'21'))
  useEffect(()=>{if(open){setMonth(current);setPreset('21');setDates(presetDates(current,'21'))}},[open])
  const changePreset=(m,p)=>{setMonth(m);setPreset(p);if(p!=='manual')setDates(presetDates(m,p))}
  const submit=e=>{e.preventDefault();if(!dates.start||!dates.end||dates.start>dates.end)return alert('Проверьте даты периода.');if(state.periods.some(p=>p.start===dates.start&&p.end===dates.end))return alert('Такой период уже существует.');const p={id:uid(),reportMonth:month,start:dates.start,end:dates.end,statements:[]};mutate(next=>next.periods.push(p));onCreated(p)}
  return <Modal open={open} onClose={onClose} title="Новый расчётный период" subtitle="Месяц станет именем периода, а даты останутся отдельным диапазоном."><form onSubmit={submit}><div className="modal-body grid-2"><Field label="Отчётный месяц"><input className="input" type="month" value={month} onChange={e=>changePreset(e.target.value,preset)}/></Field><Field label="Схема периода"><select className="select" value={preset} onChange={e=>changePreset(month,e.target.value)}><option value="21">21 предыдущего → 20 текущего</option><option value="26">26 предыдущего → 25 текущего</option><option value="calendar">Календарный месяц</option><option value="manual">Произвольные даты</option></select></Field><Field label="Начало"><DateControl value={dates.start} onChange={v=>setDates(d=>({...d,start:v}))}/></Field><Field label="Окончание"><DateControl value={dates.end} onChange={v=>setDates(d=>({...d,end:v}))}/></Field></div><div className="period-preview"><span>Будет создано</span><b>{periodDisplayName({reportMonth:month,start:dates.start,end:dates.end})}</b><small>{fmtDate(dates.start)} — {fmtDate(dates.end)}</small></div><div className="notice">Для машины с путёвками программа найдёт предыдущую заполненную ведомость и перенесёт одометр и остатки ГСМ. Машины без путёвок автоматически считаются не выезжавшими.</div><div className="modal-actions"><Button type="button" onClick={onClose}>Отмена</Button><Button primary type="submit">Создать период</Button></div></form></Modal>
}

function MaterialModal({ open, onClose, state, mutate, notify }) {
  const [form,setForm]=useState({category:'Топливо',name:'',aliases:''})
  useEffect(()=>{if(open)setForm({category:'Топливо',name:'',aliases:''})},[open])
  const submit=e=>{e.preventDefault();const name=form.name.trim();if(!name)return;if(state.catalog.some(x=>x.name.toLowerCase()===name.toLowerCase()))return alert('Такой тип уже есть в справочнике.');mutate(next=>next.catalog.push({id:`custom_${uid()}`,name,category:form.category,unit:'л',aliases:form.aliases.split(',').map(x=>x.trim()).filter(Boolean),sourceVehicles:[],sourceCount:0,active:true}));notify(`Добавлен тип: ${name}`);onClose()}
  return <Modal open={open} onClose={onClose} title="Новый тип ГСМ"><form onSubmit={submit}><div className="modal-body grid-2"><Field label="Категория"><select className="select" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}><option>Топливо</option><option>Масло</option></select></Field><Field label="Единица"><input className="input" value="л" readOnly/></Field><Field className="span-2" label="Наименование"><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder='Например, Дт "З" или Масло М-10Г2'/></Field><Field className="span-2" label="Алиасы" hint="Через запятую"><input className="input" value={form.aliases} onChange={e=>setForm(f=>({...f,aliases:e.target.value}))}/></Field></div><div className="modal-actions"><Button type="button" onClick={onClose}>Отмена</Button><Button primary type="submit">Добавить</Button></div></form></Modal>
}

function SettingsModal({ open, onClose, state, mutate, notify, appInfo }) {
  const [form,setForm]=useState(state.settings),[printers,setPrinters]=useState([]),[loading,setLoading]=useState(false),[template,setTemplate]=useState(null)
  useEffect(()=>{if(open){setForm(state.settings);refresh();refreshTemplate()}},[open])
  async function refresh(){if(!window.desktopAPI?.isElectron)return;setLoading(true);try{const list=await window.desktopAPI.listPrinters();setPrinters(Array.isArray(list)?list:[])}catch(error){reportRendererError('settings:printers',error);setPrinters([]);notify(`Не удалось получить список принтеров: ${error?.message||error}`,true)}finally{setLoading(false)}}
  async function refreshTemplate(){if(!window.desktopAPI?.isElectron)return;try{const r=await window.desktopAPI.loadTemplate();if(r?.success&&r.bytes){try{const {inspect}=await loadTemplateEngine();setTemplate({name:r.name,info:await inspect(new Uint8Array(r.bytes))})}catch(error){reportRendererError('settings:templateInspect',error);setTemplate({name:r.name,info:null});notify(`Шаблон загружен, но не распознан: ${error?.message||error}`,true)}}else{setTemplate(null);if(r?.error)notify(r.error,true)}}catch(error){reportRendererError('settings:templateLoad',error);setTemplate(null);notify(`Не удалось прочитать шаблон: ${error?.message||error}`,true)}}
  async function chooseTemplate(){try{const r=await window.desktopAPI.chooseTemplate();if(r?.success){await refreshTemplate();notify('Excel-шаблон сохранён локально')}else if(!r?.canceled)notify(r?.error||'Не удалось загрузить шаблон',true)}catch(error){reportRendererError('settings:templateChoose',error);notify(`Не удалось загрузить шаблон: ${error?.message||error}`,true)}}
  async function removeTemplate(){if(!template||!window.confirm(`Удалить шаблон «${template.name}»?`))return;try{const r=await window.desktopAPI.removeTemplate();if(!r?.success)throw new Error(r?.error||'Не удалось удалить шаблон');setTemplate(null);notify('Шаблон удалён')}catch(error){reportRendererError('settings:templateRemove',error);notify(`Не удалось удалить шаблон: ${error?.message||error}`,true)}}
  const save=()=>{mutate(next=>{next.settings={...next.settings,...form,tolerance:toleranceOf(form.tolerance),autosave:form.autosave!==false,autosaveDelay:Number(form.autosaveDelay||0),directPrint:!!form.directPrint,performanceMode:form.performanceMode!==false}});notify('Настройки сохранены');onClose()}
  return <Modal open={open} onClose={onClose} wide title="Настройки и печать" subtitle="Реквизиты, автосохранение, Excel-шаблон и Windows-принтер"><div className="modal-body grid-2"><Field label="Должность / подразделение"><input className="input" value={form.unit||''} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}/></Field><Field label="Воинское звание"><input className="input" value={form.rank||''} onChange={e=>setForm(f=>({...f,rank:e.target.value}))}/></Field><Field label="Фамилия / инициалы"><input className="input" value={form.commander||''} onChange={e=>setForm(f=>({...f,commander:e.target.value}))}/></Field><Field label="Допуск сравнения ГСМ, л"><input className="input" type="number" step="0.01" min="0" value={form.tolerance??.05} onChange={e=>setForm(f=>({...f,tolerance:e.target.value}))}/></Field><Field label="Номер машины в документе"><select className="select" value={form.regMode||'full'} onChange={e=>setForm(f=>({...f,regMode:e.target.value}))}><option value="full">Полный рег. номер</option><option value="short">Короткий номер</option></select></Field><label className="toggle-card"><input type="checkbox" checked={form.autosave!==false} onChange={e=>setForm(f=>({...f,autosave:e.target.checked}))}/><span><b>Автосохранение</b><small>Сохранять изменения локально автоматически</small></span></label><label className="toggle-card"><input type="checkbox" checked={form.performanceMode!==false} onChange={e=>setForm(f=>({...f,performanceMode:e.target.checked}))}/><span><b>Режим слабого ПК</b><small>Без blur, тяжёлых теней и анимаций</small></span></label><Field label="Задержка автосохранения, мс"><input className="input" type="number" min="0" step="100" value={form.autosaveDelay??400} onChange={e=>setForm(f=>({...f,autosaveDelay:e.target.value}))}/></Field><label className="toggle-card"><input type="checkbox" checked={!!form.directPrint} onChange={e=>setForm(f=>({...f,directPrint:e.target.checked}))}/><span><b>Прямая печать</b><small>Без диалога на выбранный принтер</small></span></label><Field className="span-2" label="Excel-шаблон ведомости"><div className="template-card"><div><b>{template?.name||'Шаблон не загружен'}</b><small>{template?.info?`${template.info.has3263?'эталон 3263 · ':''}${template.info.sheetNames?.length||0} листов`:'Загрузите исходную книгу .xlsx'}</small></div><div className="toolbar"><Button type="button" onClick={chooseTemplate}>Загрузить / заменить</Button>{template&&<Button type="button" danger onClick={removeTemplate}>Удалить</Button>}</div></div></Field><Field className="span-2" label="Принтер"><div className="printer-row"><select className="select grow" value={form.preferredPrinter||''} onChange={e=>setForm(f=>({...f,preferredPrinter:e.target.value}))}><option value="">Системный диалог печати</option>{printers.map(p=><option key={p.name} value={p.name}>{p.displayName}{p.isDefault?' — по умолчанию':''}</option>)}</select><Button type="button" onClick={refresh}>{loading?'…':'Обновить'}</Button></div></Field></div><div className="notice subtle-notice">База: {appInfo?.dataPath||'локальный профиль приложения'}. Резервные копии — только универсальный формат .gsmbackup. Electron 22 предназначен для Windows 7.</div><div className="modal-actions"><Button onClick={onClose}>Отмена</Button><Button primary onClick={save}>Сохранить</Button></div></Modal>
}

function RecoveryScreen({ appInfo, error, onRestore, onReset, onClose }) {
  return <div className="desktop-root performance-mode"><TitleBar appInfo={appInfo} onClose={onClose}/><div className="recovery-screen"><Card className="recovery-card"><div className="recovery-icon">!</div><h1>Локальная база не загружена</h1><p>Приложение остановило автоматическое сохранение, чтобы не перезаписать существующие данные пустой базой.</p><div className="recovery-error">{error}</div>{appInfo?.dataPath&&<div className="recovery-path">Файл базы: {appInfo.dataPath}</div>}<div className="toolbar recovery-actions"><Button primary onClick={onRestore}>Восстановить резервную копию</Button><Button danger onClick={onReset}>Создать пустую базу</Button><Button onClick={onClose}>Закрыть</Button></div></Card></div></div>
}

function Empty({ title, text, action, compact=false }) { return <div className={cx('empty',compact&&'empty-compact')}><b>{title}</b><span>{text}</span>{action}</div> }
