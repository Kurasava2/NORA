const TEXT_DECODER = new TextDecoder('utf-8')
const MAX_INPUT_BYTES = 64 * 1024 * 1024
const MAX_ENTRY_BYTES = 64 * 1024 * 1024
const MAX_TOTAL_BYTES = 192 * 1024 * 1024

function readUint16(dataView, offset) {
  return dataView.getUint16(offset, true)
}

function readUint32(dataView, offset) {
  return dataView.getUint32(offset, true)
}

async function inflateRaw(compressedBytes, maxBytes = MAX_ENTRY_BYTES) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Среда не поддерживает распаковку XLSX.')
  }

  const reader = new Blob([compressedBytes])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
    .getReader()
  const chunks = []
  let totalBytes = 0

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        throw new Error('Слишком большой элемент XLSX для 32-битной сборки.')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock?.()
  }

  const output = new Uint8Array(totalBytes)
  let outputOffset = 0
  for (const chunk of chunks) {
    output.set(chunk, outputOffset)
    outputOffset += chunk.byteLength
  }
  return output
}

export async function unzipXlsx(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  if (bytes.byteLength < 22 || bytes.byteLength > MAX_INPUT_BYTES) {
    throw new Error('Некорректный или слишком большой XLSX.')
  }

  const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let endOfCentralDirectoryOffset = -1

  for (
    let offset = bytes.length - 22;
    offset >= Math.max(0, bytes.length - 65557);
    offset -= 1
  ) {
    if (readUint32(dataView, offset) === 0x06054b50) {
      endOfCentralDirectoryOffset = offset
      break
    }
  }

  if (endOfCentralDirectoryOffset < 0) {
    throw new Error('Файл не похож на корректный XLSX.')
  }

  const entryCount = readUint16(dataView, endOfCentralDirectoryOffset + 10)
  let directoryOffset = readUint32(dataView, endOfCentralDirectoryOffset + 16)
  let totalUncompressedBytes = 0
  const files = new Map()

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    if (directoryOffset + 46 > bytes.length || readUint32(dataView, directoryOffset) !== 0x02014b50) {
      throw new Error('Повреждён XLSX.')
    }

    const flags = readUint16(dataView, directoryOffset + 8)
    const compressionMethod = readUint16(dataView, directoryOffset + 10)
    const compressedSize = readUint32(dataView, directoryOffset + 20)
    const uncompressedSize = readUint32(dataView, directoryOffset + 24)
    const fileNameLength = readUint16(dataView, directoryOffset + 28)
    const extraLength = readUint16(dataView, directoryOffset + 30)
    const commentLength = readUint16(dataView, directoryOffset + 32)
    const localHeaderOffset = readUint32(dataView, directoryOffset + 42)
    const nextDirectoryOffset =
      directoryOffset + 46 + fileNameLength + extraLength + commentLength

    if (flags & 1) throw new Error('XLSX защищён паролем.')
    if (uncompressedSize > MAX_ENTRY_BYTES) throw new Error('Слишком большой элемент XLSX.')

    totalUncompressedBytes += uncompressedSize
    if (totalUncompressedBytes > MAX_TOTAL_BYTES) {
      throw new Error('XLSX слишком велик после распаковки.')
    }

    const fileName = TEXT_DECODER.decode(
      bytes.slice(directoryOffset + 46, directoryOffset + 46 + fileNameLength),
    )

    if (
      localHeaderOffset + 30 > bytes.length ||
      readUint32(dataView, localHeaderOffset) !== 0x04034b50
    ) {
      throw new Error('Повреждён XLSX.')
    }

    const localNameLength = readUint16(dataView, localHeaderOffset + 26)
    const localExtraLength = readUint16(dataView, localHeaderOffset + 28)
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength
    const dataEnd = dataStart + compressedSize
    const compressedBytes = bytes.slice(dataStart, dataEnd)

    const fileData =
      compressionMethod === 0
        ? compressedBytes
        : compressionMethod === 8
          ? await inflateRaw(compressedBytes)
          : null

    if (!fileData) throw new Error('Неподдерживаемое сжатие XLSX.')

    files.set(fileName, fileData)
    directoryOffset = nextDirectoryOffset
  }

  return files
}
