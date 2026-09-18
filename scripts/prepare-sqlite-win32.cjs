const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const targetArch = process.argv[2] || 'ia32'
const machineByArch = {
  ia32: 0x014c,
  x64: 0x8664,
}

if (!machineByArch[targetArch]) {
  throw new Error(`Unsupported SQLite Windows architecture: ${targetArch}`)
}

const sqliteDirectory = path.resolve('node_modules', 'sqlite3')
const binaryPath = path.join(
  sqliteDirectory,
  'build',
  'Release',
  'node_sqlite3.node',
)

fs.rmSync(path.join(sqliteDirectory, 'build'), {
  recursive: true,
  force: true,
})

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const rebuild = spawnSync(
  npmCommand,
  ['rebuild', 'sqlite3', '--no-audit', '--no-fund'],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_arch: targetArch,
      npm_config_platform: 'win32',
      npm_config_build_from_source: 'false',
    },
  },
)

if (rebuild.status !== 0) {
  throw new Error(`sqlite3 prebuild preparation failed with code ${rebuild.status}`)
}
if (!fs.existsSync(binaryPath)) {
  throw new Error(`sqlite3 native binary was not created: ${binaryPath}`)
}

const binary = fs.readFileSync(binaryPath)
const peOffset = binary.readUInt32LE(0x3c)
const machine = binary.readUInt16LE(peOffset + 4)
const expectedMachine = machineByArch[targetArch]

if (machine !== expectedMachine) {
  throw new Error(
    `sqlite3 PE mismatch: expected 0x${expectedMachine.toString(16)}, ` +
      `got 0x${machine.toString(16)}`,
  )
}

console.log(
  `sqlite3 native binary ready for ${targetArch}: PE 0x${machine.toString(16)}`,
)
