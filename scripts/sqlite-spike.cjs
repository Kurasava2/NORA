const sqlite3 = require('@vscode/sqlite3').verbose()

function fail(error) {
  console.error(error?.stack || error)
  process.exitCode = 1
}

const db = new sqlite3.Database(':memory:', error => {
  if (error) return fail(error)

  db.serialize(() => {
    db.run('CREATE TABLE probe (id INTEGER PRIMARY KEY, value TEXT)')
    db.run('INSERT INTO probe(value) VALUES (?)', ['ok'])
    db.get('SELECT id, value FROM probe WHERE id = 1', (selectError, row) => {
      if (selectError) {
        db.close()
        return fail(selectError)
      }
      if (!row || row.id !== 1 || row.value !== 'ok') {
        db.close()
        return fail(new Error(`Unexpected SQLite result: ${JSON.stringify(row)}`))
      }
      db.close(closeError => {
        if (closeError) return fail(closeError)
        console.log(JSON.stringify({
          ok: true,
          arch: process.arch,
          versions: process.versions,
          sqlite: 'read-write-memory-probe-passed',
        }, null, 2))
      })
    })
  })
})
