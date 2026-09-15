import React from 'react'
import { classNames } from './classNames.js'

const BADGE_TONE_CLASSES = {
  ok: 'badge-ok',
  warn: 'badge-warn',
  bad: 'badge-bad',
  neutral: 'badge-neutral',
  blue: 'badge-blue',
}

function badgeToneClass(tone) {
  return BADGE_TONE_CLASSES[tone] || BADGE_TONE_CLASSES.neutral
}

export default function Badge({ tone = 'neutral', children }) {
  return <span className={classNames('badge', badgeToneClass(tone))}>{children}</span>
}
