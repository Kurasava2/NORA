const fs = require('fs')
const path = require('path')
const root = process.argv[2]
if (!root) throw new Error('Usage: node patch-v122.cjs <project-root>')

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

edit('src/index.css', s => {
  if (s.includes('@font-face') && s.includes('JetBrainsMono.woff2')) throw new Error('JetBrains Mono is already embedded')
  return `@font-face{\n  font-family:"JetBrains Mono";\n  src:url("./assets/JetBrainsMono.woff2") format("woff2");\n  font-style:normal;\n  font-weight:100 800;\n  font-display:swap;\n}\n\n` + s
})

edit('package.json', s => replaceOne(
  s,
  '"version": "1.2.1"',
  '"version": "1.2.2"',
  'version'
))
