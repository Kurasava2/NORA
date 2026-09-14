import { num, round2 } from './numbers.js'

export function smartBalance(entry, target) {
  const q = { ...entry }
  const vals = {
    start: num(q.start),
    received: num(q.received),
    spent: num(q.spent),
    end: num(q.end)
  }
  const others = Object.entries(vals).filter(([key]) => key !== target)
  if (!target || !others.every(([, value]) => value !== null)) return q

  if (target === 'end') q.end = round2(vals.start + vals.received - vals.spent)
  if (target === 'spent') q.spent = round2(vals.start + vals.received - vals.end)
  if (target === 'received') q.received = round2(vals.end - vals.start + vals.spent)
  if (target === 'start') q.start = round2(vals.end - vals.received + vals.spent)
  q._autoTarget = target
  return q
}
