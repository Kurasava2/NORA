import React from 'react'

export default function TripInsertionChoice({ position, onChange }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3">
      <div>
        <b className="block text-sm text-slate-100">Куда добавить путёвку</b>
        <span className="text-xs text-slate-400">
          Позиция задаёт порядок переноса одометра и остатков ГСМ.
        </span>
      </div>
      <select
        className="select min-w-[240px]"
        value={position}
        onChange={event => onChange(event.target.value)}
      >
        <option value="end">Следующей · вниз списка</option>
        <option value="start">В начало списка</option>
      </select>
    </div>
  )
}
