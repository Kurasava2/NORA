const fs = require('fs')
const path = require('path')
const root = process.argv[2]
if (!root) throw new Error('Usage: node patch-v121.cjs <project-root>')

function edit(rel, fn) {
  const file = path.join(root, rel)
  const before = fs.readFileSync(file, 'utf8')
  const after = fn(before)
  if (after === before) throw new Error(`Patch produced no changes: ${rel}`)
  fs.writeFileSync(file, after, 'utf8')
  console.log(`patched ${rel}`)
}

function replaceOne(s, from, to, label) {
  const i = s.indexOf(from)
  if (i < 0) throw new Error(`Patch anchor not found: ${label}`)
  if (s.indexOf(from, i + from.length) >= 0) throw new Error(`Patch anchor is not unique: ${label}`)
  return s.slice(0, i) + to + s.slice(i + from.length)
}

edit('src/lib/domain.js', s => replaceOne(
  s,
  "export function longDate(value){ if(!value)return ''; return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${value}T12:00:00`)) }",
  "export function longDate(value){ if(!value)return ''; return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${value}T12:00:00`)).replace(/\\s+г\\.$/u,' г') }",
  'longDate'
))

edit('src/lib/templateEngine.js', s => replaceOne(
  s,
  '(?:года?|г\\.)?',
  '(?:года?|г\\.?)?',
  'period parser year suffix'
))

edit('src/App.jsx', s => {
  s = replaceOne(s,
`  const refreshCarry = () => mutate(next => {
    const p = next.periods.find(x=>x.id===period.id); const st = p.statements.find(x=>x.id===statement.id); st.opening = buildOpening(next, st.vehicleId, p); reconcileCarryForward(next, st)
  })
`,
`  const refreshCarry = () => mutate(next => {
    const p = next.periods.find(x=>x.id===period.id); const st = p.statements.find(x=>x.id===statement.id); st.opening = buildOpening(next, st.vehicleId, p); reconcileCarryForward(next, st)
  })
  const deleteTripFromList = trip => {
    if (!window.confirm(\`Удалить путёвку №\${trip.number || '—'} от \${fmtDate(trip.date)}?\`)) return
    mutate(next => {
      const p = next.periods.find(x=>x.id===period.id)
      const st = p.statements.find(x=>x.id===statement.id)
      st.trips = st.trips.filter(t=>t.id!==trip.id)
      reconcileCarryForward(next,st)
    })
    notify('Путёвка удалена')
  }
`, 'statement delete handler')
  s = replaceOne(s,
    '<TripTable state={state} period={period} statement={statement} vehicle={vehicle} onEdit={trip => setEditor({ open: true, trip })}/>',
    '<TripTable state={state} period={period} statement={statement} vehicle={vehicle} onEdit={trip => setEditor({ open: true, trip })} onDelete={deleteTripFromList}/>',
    'TripTable props')
  s = replaceOne(s,
    'function TripTable({ state, period, statement, vehicle, onEdit }) {',
    'function TripTable({ state, period, statement, vehicle, onEdit, onDelete }) {',
    'TripTable signature')
  s = replaceOne(s,
    '<td>{errs.length?<Badge tone="bad">{errs.length}</Badge>:<Badge tone="ok">✓</Badge>}</td></tr>',
    '<td className="actions">{errs.length?<Badge tone="bad">{errs.length}</Badge>:<Badge tone="ok">✓</Badge>}<Button small danger onClick={e=>{e.stopPropagation();onDelete(t)}}>Удалить</Button></td></tr>',
    'TripTable delete button')
  return s
})

edit('package.json', s => {
  s = replaceOne(s, '"version": "1.2.0"', '"version": "1.2.1"', 'version')
  s = replaceOne(s,
    '"dist:win7": "npm run build && electron-builder --win portable --x64",\n    "dist:dir": "npm run build && electron-builder --win dir --x64"',
    '"dist:win7": "npm run dist:win7:x86",\n    "dist:win7:x86": "npm run build && electron-builder --win portable --ia32",\n    "dist:win7:x64": "npm run build && electron-builder --win portable --x64",\n    "dist:dir": "npm run build && electron-builder --win dir --ia32"',
    'build scripts')
  s = replaceOne(s,
    '"target": [{"target": "portable", "arch": ["x64"]}]',
    '"target": "portable"',
    'builder arch')
  return s
})
