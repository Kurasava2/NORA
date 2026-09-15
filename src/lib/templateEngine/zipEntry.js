const textDecoder = new TextDecoder('utf-8')

export const MAX_ENTRY_UNCOMPRESSED_BYTES = 64 * 1024 * 1024
export const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
export const LOCAL_FILE_SIGNATURE = 0x04034b50

export function readUint16(dataView, offset) {
  return dataView.getUint16(offset, true)
}

export function readUint32(dataView, offset) {
  return dataView.getUint32(offset, true)
}

export function readCentralDirectoryEntry(bytes, dataView, directoryOffset) {
  if (
    directoryOffset + 46 > bytes.length ||
    readUint32(dataView, directoryOffset) !== CENTRAL_DIRECTORY_SIGNATURE
  ) {
    throw new Error('Повреждён центральный каталог XLSX.')
  }

  const flags = readUint16(dataView, directoryOffset + 8)
  const compressionMethod = readUint16(dataView, directoryOffset + 10)
  const compressedSize = readUint32(dataView, directoryOffset + 20)
  const uncompressedSize = readUint32(dataView, directoryOffset + 24)
  const fileNameLength = readUint16(dataView, directoryOffset + 28)
  const extraLength = readUint16(dataView, directoryOffset + 30)
  const commentLength = readUint16(dataView, directoryOffset + 32)
  const localOffset = readUint32(dataView, directoryOffset + 42)
  const nextDirectoryOffset =
    directoryOffset + 46 + fileNameLength + extraLength + commentLength

  if (nextDirectoryOffset > bytes.length || fileNameLength > 2048) {
    throw new Error('Повреждён центральный каталог XLSX.')
  }
  if (flags & 1) {
    throw new Error('XLSX защищён паролем. Снимите защиту и повторите импорт.')
  }
  if (uncompressedSize > MAX_ENTRY_UNCOMPRESSED_BYTES) {
    throw new Error(
      'XLSX содержит слишком большой распакованный элемент для 32-битной сборки.',
    )
  }

  return {
    compressionMethod,
    compressedSize,
    fileName: textDecoder.decode(
      bytes.slice(directoryOffset + 46, directoryOffset + 46 + fileNameLength),
    ),
    localOffset,
    nextDirectoryOffset,
    uncompressedSize,
  }
}

export function readCompressedEntryBytes(bytes, dataView, entry) {
  if (
    entry.localOffset + 30 > bytes.length ||
    readUint32(dataView, entry.localOffset) !== LOCAL_FILE_SIGNATURE
  ) {
    throw new Error(`Повреждён XLSX: не найдена локальная запись ${entry.fileName}`)
  }

  const localFileNameLength = readUint16(dataView, entry.localOffset + 26)
  const localExtraLength = readUint16(dataView, entry.localOffset + 28)
  const dataStart = entry.localOffset + 30 + localFileNameLength + localExtraLength
  const dataEnd = dataStart + entry.compressedSize

  if (dataStart > bytes.length || dataEnd > bytes.length) {
    throw new Error(`Повреждён XLSX: обрезаны данные ${entry.fileName}`)
  }
  return bytes.slice(dataStart, dataEnd)
}
