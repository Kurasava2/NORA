import {
  MAX_ENTRY_UNCOMPRESSED_BYTES,
  readCentralDirectoryEntry,
  readCompressedEntryBytes,
  readUint16,
  readUint32,
} from './zipEntry.js'

const MAX_XLSX_INPUT_BYTES = 64 * 1024 * 1024
const MAX_ZIP_ENTRIES = 4096
const MAX_TOTAL_UNCOMPRESSED_BYTES = 192 * 1024 * 1024
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50

export { readUint16, readUint32 }
export const rd16 = readUint16
export const rd32 = readUint32

export async function inflateRaw(
  compressedBytes,
  maxBytes = MAX_ENTRY_UNCOMPRESSED_BYTES,
) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'Этот браузер не поддерживает распаковку XLSX. Используйте настольную версию приложения.',
    )
  }

  const decompressionStream = new Blob([compressedBytes])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  const streamReader = decompressionStream.getReader()
  const chunks = []
  let totalBytes = 0

  try {
    while (true) {
      const { value: chunk, done } = await streamReader.read()
      if (done) break

      totalBytes += chunk.byteLength
      if (totalBytes > maxBytes) {
        await streamReader.cancel()
        throw new Error(
          'XLSX содержит слишком большой распакованный элемент для 32-битной сборки.',
        )
      }
      chunks.push(chunk)
    }
  } catch (error) {
    if (String(error?.message || '').includes('слишком большой')) throw error
    throw new Error('Повреждён XLSX: не удалось распаковать данные.')
  } finally {
    streamReader.releaseLock?.()
  }

  const outputBytes = new Uint8Array(totalBytes)
  let outputOffset = 0
  for (const chunk of chunks) {
    outputBytes.set(chunk, outputOffset)
    outputOffset += chunk.byteLength
  }
  return outputBytes
}

function findEndOfCentralDirectory(dataView, byteLength) {
  const minimumOffset = Math.max(0, byteLength - 65557)
  for (let offset = byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (readUint32(dataView, offset) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset
    }
  }
  return -1
}

function validateArchiveSize(bytes) {
  if (bytes.byteLength < 22) {
    throw new Error('Файл не похож на корректный XLSX/ZIP.')
  }
  if (bytes.byteLength > MAX_XLSX_INPUT_BYTES) {
    throw new Error(
      'XLSX больше 64 МБ. Для 32-битной сборки импорт такого файла заблокирован.',
    )
  }
}

async function decompressEntry(entry, compressedBytes) {
  if (entry.compressionMethod === 0) return compressedBytes
  if (entry.compressionMethod === 8) {
    return inflateRaw(compressedBytes, MAX_ENTRY_UNCOMPRESSED_BYTES)
  }
  throw new Error(`Неподдерживаемый метод сжатия XLSX: ${entry.compressionMethod}`)
}

export async function unzip(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  validateArchiveSize(bytes)

  const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const endDirectoryOffset = findEndOfCentralDirectory(dataView, bytes.length)
  if (endDirectoryOffset < 0) {
    throw new Error('Файл не похож на корректный XLSX/ZIP.')
  }

  const entryCount = readUint16(dataView, endDirectoryOffset + 10)
  const centralDirectoryOffset = readUint32(dataView, endDirectoryOffset + 16)
  if (entryCount > MAX_ZIP_ENTRIES) {
    throw new Error('XLSX содержит слишком много внутренних файлов.')
  }
  if (centralDirectoryOffset >= endDirectoryOffset) {
    throw new Error('Повреждён центральный каталог XLSX.')
  }

  const files = new Map()
  let directoryOffset = centralDirectoryOffset
  let totalUncompressedBytes = 0

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    const entry = readCentralDirectoryEntry(bytes, dataView, directoryOffset)
    totalUncompressedBytes += entry.uncompressedSize
    if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error(
        'XLSX распаковывается более чем в 192 МБ. Импорт заблокирован для защиты памяти.',
      )
    }

    const compressedBytes = readCompressedEntryBytes(bytes, dataView, entry)
    const uncompressedBytes = await decompressEntry(entry, compressedBytes)
    if (uncompressedBytes.byteLength !== entry.uncompressedSize) {
      throw new Error(
        `Повреждён XLSX: неверный размер распакованного элемента ${entry.fileName}`,
      )
    }

    files.set(entry.fileName, uncompressedBytes)
    directoryOffset = entry.nextDirectoryOffset
  }

  return files
}
