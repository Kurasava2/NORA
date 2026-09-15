import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentFile = fileURLToPath(import.meta.url)
const projectRoot = path.dirname(path.dirname(currentFile))
const sourceRoots = ['src', 'electron']
const codeExtensions = new Set(['.js', '.jsx', '.cjs'])
const maxLinesPerCodeFile = 180

function collectCodeFiles(directoryPath) {
  const files = []
  for (const directoryEntry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, directoryEntry.name)
    if (directoryEntry.isDirectory()) {
      files.push(...collectCodeFiles(entryPath))
    } else if (codeExtensions.has(path.extname(directoryEntry.name))) {
      files.push(entryPath)
    }
  }
  return files
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/')
}

function filesMatching(pattern) {
  const violations = []
  for (const filePath of codeFiles) {
    const source = fs.readFileSync(filePath, 'utf8')
    pattern.lastIndex = 0
    if (pattern.test(source)) violations.push(relativePath(filePath))
  }
  return violations
}

const codeFiles = sourceRoots.flatMap(rootName =>
  collectCodeFiles(path.join(projectRoot, rootName)),
)

test('code modules stay below the 180-line architecture limit', () => {
  const oversizedFiles = []
  for (const filePath of codeFiles) {
    const lineCount = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length
    if (lineCount > maxLinesPerCodeFile) {
      oversizedFiles.push(`${relativePath(filePath)}: ${lineCount}`)
    }
  }

  assert.deepEqual(
    oversizedFiles,
    [],
    `Split oversized modules:\n${oversizedFiles.join('\n')}`,
  )
})

test('code does not introduce one-letter variable declarations', () => {
  const violations = filesMatching(/\b(?:const|let|var)\s+[A-Za-z]\s*(?:=|;|,)/g)
  assert.deepEqual(
    violations,
    [],
    `Use descriptive variable names in:\n${violations.join('\n')}`,
  )
})

test('functions and callbacks do not use one-letter parameters', () => {
  const namedFunctionViolations = filesMatching(
    /function\s+[A-Za-z0-9_$]+\s*\([^)]*(?:^|[,\s])([A-Za-z])(?:\s*[,)]|\s*=)/gm,
  )
  const arrowFunctionViolations = filesMatching(
    /(?:\(\s*[A-Za-z]\s*\)|\b[A-Za-z])\s*=>/g,
  )
  const catchViolations = filesMatching(/catch\s*\(\s*[A-Za-z]\s*\)/g)
  const violations = [...new Set([
    ...namedFunctionViolations,
    ...arrowFunctionViolations,
    ...catchViolations,
  ])]

  assert.deepEqual(
    violations,
    [],
    `Use descriptive function parameters in:\n${violations.join('\n')}`,
  )
})

test('source files do not contain minified code lines', () => {
  const violations = []
  for (const filePath of codeFiles) {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
    const longestLine = Math.max(0, ...lines.map(line => line.length))
    if (longestLine > 220) {
      violations.push(`${relativePath(filePath)}: ${longestLine} chars`)
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Reformat or split minified lines:\n${violations.join('\n')}`,
  )
})
