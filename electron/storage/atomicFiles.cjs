const fs = require('fs')
const path = require('path')

function temporaryPathFor(targetPath) {
  const directoryPath = path.dirname(targetPath)
  return path.join(
    directoryPath,
    `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp`,
  )
}

async function writeFileAtomic(filePath, fileContents, encoding = null) {
  const directoryPath = path.dirname(filePath)
  const temporaryPath = temporaryPathFor(filePath)
  await fs.promises.mkdir(directoryPath, { recursive: true })

  let fileHandle = null
  try {
    fileHandle = await fs.promises.open(temporaryPath, 'w')
    await fileHandle.writeFile(fileContents, encoding || undefined)
    await fileHandle.sync()
    await fileHandle.close()
    fileHandle = null
    await fs.promises.rename(temporaryPath, filePath)
    return { success: true }
  } catch (error) {
    if (fileHandle) {
      try {
        await fileHandle.close()
      } catch {}
    }
    try {
      await fs.promises.unlink(temporaryPath)
    } catch {}
    throw error
  }
}

async function copyFileAtomic(sourcePath, targetPath) {
  const targetDirectoryPath = path.dirname(targetPath)
  const temporaryPath = temporaryPathFor(targetPath)
  await fs.promises.mkdir(targetDirectoryPath, { recursive: true })

  try {
    await fs.promises.copyFile(sourcePath, temporaryPath)
    await fs.promises.rename(temporaryPath, targetPath)
    return { success: true }
  } catch (error) {
    try {
      await fs.promises.unlink(temporaryPath)
    } catch {}
    throw error
  }
}

module.exports = {
  writeFileAtomic,
  copyFileAtomic,
}
