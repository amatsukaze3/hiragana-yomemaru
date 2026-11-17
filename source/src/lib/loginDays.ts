/**
 * ログイン日数（この端末で アプリを ひらいた 日の かず）
 * ひらがなよめ丸・よめ丸シューティング の どちらを ひらいても 1日 として かぞえる。
 */
import { lsGet, lsSet } from './storage'

const KEY = 'yomemaru:days'
const UNLOCK_KEY = 'yomemaru:batchiriUnlock'
const SEEN_KEY = 'yomemaru:batchiriSeen'
/** 「これで ばっちり モード」が でてくる ログイン日 */
export const BATCHIRI_DAY = 3

const today = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
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
