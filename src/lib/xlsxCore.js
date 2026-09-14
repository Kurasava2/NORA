const enc = new TextEncoder()

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let value = n
    for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1)
    table[n] = value >>> 0
  }
  return table
})()

export function crc32(bytes) {
  let value = 0xffffffff
  for (let i = 0; i < bytes.length; i++) value = crcTable[(value ^ bytes[i]) & 255] ^ (value >>> 8)
  return (value ^ 0xffffffff) >>> 0
}

function u16(value) {
  return Uint8Array.of(value & 255, (value >>> 8) & 255)
}

function u32(value) {
  return Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255)
}

function concat(...arrays) {
  const length = arrays.reduce((sum, array) => sum + array.length, 0)
  const out = new Uint8Array(length)
  let offset = 0
  for (const array of arrays) {
    out.set(array, offset)
    offset += array.length
  }
  return out
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear()) - 1980
  return {
    time: ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff,
    date: ((year << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff
  }
}

export function zip(files) {
  const locals = []
  const centrals = []
  let offset = 0
  const timestamp = dosDateTime()

  for (const file of files) {
    const name = enc.encode(file.name)
    const data = file.data instanceof Uint8Array ? file.data : enc.encode(file.data)
    const checksum = crc32(data)
    const local = concat(
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(timestamp.time), u16(timestamp.date),
      u32(checksum), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data
    )
    locals.push(local)
    const central = concat(
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(timestamp.time), u16(timestamp.date),
      u32(checksum), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset), name
    )
    centrals.push(central)
    offset += local.length
  }

  const centralSize = centrals.reduce((sum, array) => sum + array.length, 0)
  const end = concat(
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralSize), u32(offset), u16(0)
  )
  return concat(...locals, ...centrals, end)
}
