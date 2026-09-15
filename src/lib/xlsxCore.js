const textEncoder = new TextEncoder()

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let tableIndex = 0; tableIndex < 256; tableIndex += 1) {
    let crcValue = tableIndex
    for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
      crcValue = crcValue & 1 ? 0xedb88320 ^ (crcValue >>> 1) : crcValue >>> 1
    }
    table[tableIndex] = crcValue >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crcValue = 0xffffffff
  for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
    crcValue = crcTable[(crcValue ^ bytes[byteIndex]) & 255] ^ (crcValue >>> 8)
  }
  return (crcValue ^ 0xffffffff) >>> 0
}

function uint16(value) {
  return Uint8Array.of(value & 255, (value >>> 8) & 255)
}

function uint32(value) {
  return Uint8Array.of(
    value & 255,
    (value >>> 8) & 255,
    (value >>> 16) & 255,
    (value >>> 24) & 255,
  )
}

function concatenateByteArrays(...arrays) {
  const totalLength = arrays.reduce((length, array) => length + array.length, 0)
  const combined = new Uint8Array(totalLength)
  let writeOffset = 0

  for (const array of arrays) {
    combined.set(array, writeOffset)
    writeOffset += array.length
  }
  return combined
}

function dosDateTime(date = new Date()) {
  const dosYear = Math.max(1980, date.getFullYear()) - 1980
  return {
    time:
      ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff,
    date: ((dosYear << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff,
  }
}

function entryBytes(entryData) {
  return entryData instanceof Uint8Array ? entryData : textEncoder.encode(entryData)
}

export function zip(files) {
  const localEntries = []
  const centralEntries = []
  const archiveDateTime = dosDateTime()
  let localOffset = 0

  for (const file of files) {
    const fileNameBytes = textEncoder.encode(file.name)
    const dataBytes = entryBytes(file.data)
    const checksum = crc32(dataBytes)
    const localEntry = concatenateByteArrays(
      uint32(0x04034b50),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(archiveDateTime.time),
      uint16(archiveDateTime.date),
      uint32(checksum),
      uint32(dataBytes.length),
      uint32(dataBytes.length),
      uint16(fileNameBytes.length),
      uint16(0),
      fileNameBytes,
      dataBytes,
    )
    localEntries.push(localEntry)

    const centralEntry = concatenateByteArrays(
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(archiveDateTime.time),
      uint16(archiveDateTime.date),
      uint32(checksum),
      uint32(dataBytes.length),
      uint32(dataBytes.length),
      uint16(fileNameBytes.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(localOffset),
      fileNameBytes,
    )
    centralEntries.push(centralEntry)
    localOffset += localEntry.length
  }

  const centralSize = centralEntries.reduce((size, entry) => size + entry.length, 0)
  const endRecord = concatenateByteArrays(
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralSize),
    uint32(localOffset),
    uint16(0),
  )

  return concatenateByteArrays(...localEntries, ...centralEntries, endRecord)
}
