const sqlite3 = require('sqlite3')

function openDatabase(filePath) {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(filePath, error => {
      if (!error) {
        resolve(database)
        return
      }
      database.close(() => reject(error))
    })
  })
}

function exec(database, sql) {
  return new Promise((resolve, reject) => {
    database.exec(sql, error => {
      if (error) reject(error)
      else resolve()
    })
  })
}

function run(database, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, parameters, function onRun(error) {
      if (error) reject(error)
      else resolve({ lastId: this.lastID, changes: this.changes })
    })
  })
}

function get(database, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, parameters, (error, row) => {
      if (error) reject(error)
      else resolve(row || null)
    })
  })
}

function all(database, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, parameters, (error, rows) => {
      if (error) reject(error)
      else resolve(rows || [])
    })
  })
}

function closeDatabase(database) {
  if (!database) return Promise.resolve()
  return new Promise((resolve, reject) => {
    database.close(error => {
      if (error) reject(error)
      else resolve()
    })
  })
}

async function withTransaction(database, action) {
  await exec(database, 'BEGIN IMMEDIATE')
  try {
    const result = await action()
    await exec(database, 'COMMIT')
    return result
  } catch (error) {
    try {
      await exec(database, 'ROLLBACK')
    } catch {}
    throw error
  }
}

module.exports = {
  openDatabase,
  closeDatabase,
  exec,
  run,
  get,
  all,
  withTransaction,
}
