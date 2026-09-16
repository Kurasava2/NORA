import assert from 'node:assert/strict'
import test from 'node:test'
import { orderedMaterialNames } from '../src/lib/domain/materials.js'

const state = {
  catalog: [
    { name: 'ДТ "А"', category: 'Топливо' },
    { name: 'ДТ "З"', category: 'Топливо' },
    { name: 'Масло "Р"', category: 'Масло' },
    { name: 'Масло М-10Г2', category: 'Масло' },
    { name: 'Масло М4/14Д', category: 'Масло' },
  ],
}

test('document material order keeps fuels before oils with common types first', () => {
  const ordered = orderedMaterialNames(state, [
    'Масло М4/14Д',
    'ДТ "А"',
    'Масло "Р"',
    'ДТ "З"',
    'Масло М-10Г2',
  ])

  assert.deepEqual(ordered, [
    'ДТ "З"',
    'ДТ "А"',
    'Масло "Р"',
    'Масло М-10Г2',
    'Масло М4/14Д',
  ])
})
