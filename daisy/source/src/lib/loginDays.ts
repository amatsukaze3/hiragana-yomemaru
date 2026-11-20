/**
 * ログイン日数（この端末で アプリを ひらいた 日の かず）
 * ひらがなデイジーちゃん（シューティングを ふくむ）を ひらいた 日を かぞえる（ひらがなよめ丸とは べつに かぞえる）。
 */
import { lsGet, lsSet } from './storage'

const KEY = 'daisy:days'
const UNLOCK_KEY = 'daisy:batchiriUnlock'
const SEEN_KEY = 'daisy:batchiriSeen'
/** 「これで ばっちり モード」が でてくる ログイン日 */
export const BATCHIRI_DAY = 3

const BACKFILL_KEY = 'daisy:daysBackfilled'
/** さかのぼって かぞえる 日数（きょうを ふくめて 7日） */
const BACKFILL_DAYS = 7

const dayOf = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const today = () => dayOf(new Date())

const readJson = (key: string): unknown => {
  try {
    return JSON.parse(lsGet(key) ?? 'null')
  } catch {
    return null
  }
}

/**
 * 日数を かぞえはじめる まえに あそんだ 日を、この端末に のこっている 日づけつきの きろくから さかのぼって かぞえる（さいしょの 1かいだけ）。
 * - アセスメントの きろく（日付）
 * - こえの とうろく（日付）
 * - シューティングの とちゅうセーブ（じこく）
 * - まちがいログ（じこく）
 * きょうを ふくめて さいきん 7日ぶん だけを かぞえる。
 */
function backfill() {
  if (lsGet(BACKFILL_KEY) === '1') return
  const stamps: number[] = []
  const add = (v: unknown) => {
    const t = typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) : NaN
    if (Number.isFinite(t)) stamps.push(t)
  }
  const assess = readJson('daisy:assess')
  if (Array.isArray(assess)) for (const r of assess) add((r as { date?: string })?.date)
  add((readJson('daisy:voiceprint') as { date?: string } | null)?.date)
  add((readJson('daisy:shoot:save') as { savedAt?: number } | null)?.savedAt)
  const log = readJson('daisy:errlog') as { recent?: { t?: number }[]; totals?: Record<string, { last?: number }> } | null
  if (log) {
    for (const e of log.recent ?? []) add(e?.t)
    for (const t of Object.values(log.totals ?? {})) add(t?.last)
  }
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (BACKFILL_DAYS - 1))
  const now = Date.now()
  const found = stamps.filter((t) => t >= start.getTime() && t <= now).map((t) => dayOf(new Date(t)))
  const days = [...new Set([...loadDays(), ...found])].sort()
  lsSet(KEY, JSON.stringify(days.slice(-1000)))
  lsSet(BACKFILL_KEY, '1')
}

export function loadDays(): string[] {
  try {
    const a = JSON.parse(lsGet(KEY) ?? '[]')
    return Array.isArray(a) ? a.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** きょうを きろくする（アプリを ひらいたとき・もどってきたときに よぶ） */
export function recordToday() {
  backfill()
  const days = loadDays()
  const t = today()
  if (days.includes(t)) return
  lsSet(KEY, JSON.stringify([...days, t].slice(-1000)))
}

export const loginDayCount = () => loadDays().length

/** せんせいが「すぐに だす」に したか */
export const batchiriForced = () => lsGet(UNLOCK_KEY) === '1'
export const setBatchiriForced = (on: boolean) => lsSet(UNLOCK_KEY, on ? '1' : '')

export function batchiriUnlocked() {
  return batchiriForced() || loginDayCount() >= BATCHIRI_DAY
}

/** あと なんにちで でてくるか */
export const daysUntilBatchiri = () => Math.max(0, BATCHIRI_DAY - loginDayCount())

/** 「あたらしい モード」の おしらせを もう みたか */
export const batchiriSeen = () => lsGet(SEEN_KEY) === '1'
export const setBatchiriSeen = () => lsSet(SEEN_KEY, '1')

/** アプリを ひらいている あいだに 日づけが かわっても かぞえる */
export function installDayTracker() {
  recordToday()
  const on = () => document.visibilityState === 'visible' && recordToday()
  document.addEventListener('visibilitychange', on)
  window.addEventListener('focus', on)
}
