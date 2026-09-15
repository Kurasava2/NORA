const jsonStorage = require('./storage/jsonStorage.cjs')
const atomicFiles = require('./storage/atomicFiles.cjs')

module.exports = {
  ...jsonStorage,
  ...atomicFiles,
}
