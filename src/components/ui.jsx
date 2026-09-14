import React, { useEffect, useRef } from 'react'

export const cx = (...a) => a.flat().filter(Boolean).join(' ')
const toneClass = tone => ({ ok:'badge-ok', warn:'badge-warn', bad:'badge-bad', neutral:'badge-neutral', blue:'badge-blue' }[tone] || 'badge-neutral')

export function Badge({ tone='neutral', children }) { return <span className={cx('badge', toneClass(tone))}>{children}</span> }
export function Button({ children, primary, danger, ghost, small, icon, className, ...props }) {
  return <button className={cx('btn', primary&&'btn-primary', danger&&'btn-danger', ghost&&'btn-ghost', small&&'btn-small', icon&&'btn-icon', className)} {...props}>{children}</button>
}
export function Card({ children, className='', ...props }) { return <div className={cx('card', className)} {...props}>{children}</div> }
export function Field({ label, hint, children, className='' }) { return <label className={cx('field',className)}><span className="field-label">{label}</span>{children}{hint&&<span className="field-hint">{hint}</span>}</label> }
export function Kpi({ value, label, tone }) { return <div className={cx('kpi',tone&&`kpi-${tone}`)}><b>{value}</b><span>{label}</span></div> }
export function PageHead({ title, subtitle, actions }) { return <div className="page-head"><div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div><div className="toolbar">{actions}</div></div> }
export function NavButton({ active, onClick, icon, label }) { return <button onClick={onClick} className={cx('nav-button',active&&'active')}><span>{icon}</span>{label}</button> }
export function Empty({ title, text, action, compact=false }) { return <div className={cx('empty',compact&&'empty-compact')}><b>{title}</b><span>{text}</span>{action}</div> }

export function Modal({ open, title, subtitle, onClose, children, wide=false, extraWide=false }) {
  const dialogRef=useRef(null), onCloseRef=useRef(onClose)
  onCloseRef.current=onClose
  useEffect(()=>{
    if(!open)return
    const previousFocus=document.activeElement
    const focusable=()=>[...(dialogRef.current?.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')||[])].filter(el=>!el.hidden)
    const onKey=e=>{
      if(e.key==='Escape'){e.preventDefault();onCloseRef.current?.();return}
      if(e.key!=='Tab')return
      const items=focusable();if(!items.length){e.preventDefault();dialogRef.current?.focus();return}
      const first=items[0],last=items[items.length-1],active=document.activeElement
      if(e.shiftKey&&(active===first||!dialogRef.current?.contains(active))){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&(active===last||!dialogRef.current?.contains(active))){e.preventDefault();first.focus()}
    }
    window.addEventListener('keydown',onKey)
    const frame=window.requestAnimationFrame(()=>{if(!dialogRef.current?.contains(document.activeElement))(focusable()[0]||dialogRef.current)?.focus()})
    return()=>{window.removeEventListener('keydown',onKey);window.cancelAnimationFrame(frame);if(previousFocus?.isConnected)previousFocus.focus?.()}
  },[open])
  if(!open)return null
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose?.()}>
    <div ref={dialogRef} tabIndex={-1} className={cx('modal',wide&&'modal-wide',extraWide&&'modal-extra-wide')} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="modal-close" onClick={onClose} aria-label="Закрыть" title="Закрыть">×</button></div>
      {children}
    </div>
  </div>
}

export function ConfirmDialog({ dialog, onResolve }) {
  if(!dialog)return null
  return <Modal open title={dialog.title||'Подтверждение'} subtitle={dialog.subtitle} onClose={()=>onResolve(false)}>
    <div className="confirm-body"><p>{dialog.message}</p>{dialog.detail&&<small>{dialog.detail}</small>}</div>
    <div className="modal-actions"><Button onClick={()=>onResolve(false)}>{dialog.cancelText||'Отмена'}</Button><Button danger={dialog.danger!==false} primary={dialog.danger===false} onClick={()=>onResolve(true)}>{dialog.confirmText||'Подтвердить'}</Button></div>
  </Modal>
}

export function TitleBar({ appInfo, onClose, onUndo, onRedo, canUndo, canRedo }) {
  const api=window.desktopAPI, canControl=!!api?.isElectron
  return <header className="titlebar" onDoubleClick={e=>{if(!e.target.closest('button'))api?.maximizeWindow?.()}}>
    <div className="titlebar-brand"><div className="titlebar-mark">Г</div><div className="titlebar-copy"><b>ГСМ Ведомости</b><span>{appInfo?.version?`v${appInfo.version}`:'desktop'}</span></div></div>
    <div className="titlebar-actions">
      <div className="history-controls"><button className="history-btn" onClick={onUndo} disabled={!canUndo} title="Отменить (Ctrl+Z)" aria-label="Отменить">↶</button><button className="history-btn" onClick={onRedo} disabled={!canRedo} title="Повторить (Ctrl+Y)" aria-label="Повторить">↷</button></div>
      {canControl&&<div className="window-controls"><button className="window-btn" onClick={()=>api?.minimizeWindow?.()} title="Свернуть" aria-label="Свернуть">−</button><button className="window-btn" onClick={()=>api?.maximizeWindow?.()} title="Развернуть" aria-label="Развернуть">□</button><button className="window-btn window-close" onClick={onClose||(()=>api?.closeWindow?.())} title="Закрыть" aria-label="Закрыть">×</button></div>}
    </div>
  </header>
}

export function DateControl({ value, onChange, min, max, large=false }) {
  const weekday=value?new Intl.DateTimeFormat('ru-RU',{weekday:'short',day:'2-digit',month:'short'}).format(new Date(`${value}T12:00:00`)):'дата не выбрана'
  const shift=delta=>{if(!value)return value;const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+delta);let next=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;if(min&&next<min)next=min;if(max&&next>max)next=max;return next}
  return <div className={cx('date-control',large&&'date-control-lg')}><Button type="button" icon small onClick={()=>onChange(shift(-1))} title="Предыдущий день">‹</Button><div className="date-core"><input className={cx('input',large&&'input-lg')} type="date" value={value||''} min={min} max={max} onChange={e=>onChange(e.target.value)}/><small>{weekday}</small></div><Button type="button" icon small onClick={()=>onChange(shift(1))} title="Следующий день">›</Button></div>
}
