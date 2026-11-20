/**
 * まちがいログ（この端末の ブラウザの中だけに 保存。けすまで ずっと あつめつづける）
 *
 * - まちがえた（wrong）  … こえに だして よんだけど、マイクの はんていで ちがう よみだった
 * - よめなかった（unread）… シューティングで カードを おとした／アセスメントの「よめない」／せんせいヘルプで ごうかくにした
 *
 * シューティング・アセスメントモード・これで ばっちり モード で きろくし、
 * 「これで ばっちり モード」は 「いまの にがて度」の たかい じゅんに 3もじを だす。
 *
 * いまの にがて度（もじごと）
 * - まちがえた・よめなかった … +1
 * - じかんが たつと へっていく（2しゅうかんで はんぶん）… むかしの まちがいより さいきんの まちがいを おもく みる
 * - マイクで ただしく よめた … 0.8ばいに へる
 * - カンペキテストを クリア … その 3もじは はんぶんに へる
 * だから、こどもが よめるように なった もじは しだいに でなくなり、いま にがてな もじが でてくる。
 * （まちがえた・よめなかった の かいすう そのものは、けすまで へらない）
 */
import { KANA, type Kana } from '../data/kana'
import { loadMastered } from './progress'
import { lsGet, lsSet } from './storage'

export type ErrKind = 'wrong' | 'unread'
export type ErrSource = 'shoot' | 'assess' | 'batchiri'

export interface ErrTotals {
  /** まちがえた かい */
  w: number
  /** よめなかった かい */
  u: number
  /** さいごに まちがえた じこく（ミリ秒） */
  last: number
  /** いまの にがて度（sAt の じてんの あたい） */
  s?: number
  sAt?: number
}

export interface ErrEvent {
  k: Kana
  t: number
  y: 'w' | 'u'
  s: ErrSource
}

export interface ErrorLog {
  v: 1
  /** もじごとの ごうけい（けすまで へらない） */
  totals: Partial<Record<Kana, ErrTotals>>
  /** さいきんの きろく（あたらしい じゅん。ひょうじ用に さいだい RECENT_MAX けん） */
  recent: ErrEvent[]
  /** きろくを はじめた じこく */
  since: number
}

const KEY = 'daisy:errlog'
/** にがて度が はんぶんに なるまでの じかん */
const HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000
/** これより ひくい にがて度の もじは「にがて」と みなさない */
const WEAK_MIN = 0.3
const RECENT_MAX = 500
export const SOURCE_LABEL: Record<ErrSource, string> = { shoot: 'シューティング', assess: 'アセスメント', batchiri: 'ばっちりモード' }
export const KIND_LABEL: Record<ErrKind, string> = { wrong: 'まちがえた', unread: 'よめなかった' }

const empty = (): ErrorLog => ({ v: 1, totals: {}, recent: [], since: Date.now() })

export function loadErrorLog(): ErrorLog {
  try {
    const raw = lsGet(KEY)
    if (raw) {
      const d = JSON.parse(raw) as ErrorLog
      if (d && d.v === 1 && d.totals && Array.isArray(d.recent)) return d
    }
  } catch {
    /* こわれていたら あたらしく */
  }
  return migrate()
}

/** まえの シューティングの きろく（おとした かず）が あれば「よめなかった」として ひきつぐ */
function migrate(): ErrorLog {
  const log = empty()
  try {
    const old = JSON.parse(lsGet('daisy:shoot:history') ?? '{}') as Record<string, { miss?: number }>
    for (const k of KANA) {
      const m = old[k]?.miss ?? 0
      if (m > 0) log.totals[k] = { w: 0, u: m, last: Date.now() }
    }
  } catch {
    /* noop */
  }
  save(log)
  return log
}

function save(log: ErrorLog) {
  lsSet(KEY, JSON.stringify(log))
}

/** いまの にがて度（じかんで へった あとの あたい） */
export function weaknessNow(t: ErrTotals | undefined, now = Date.now()) {
  if (!t) return 0
  const s = t.s ?? t.w + t.u
  const at = t.sAt ?? t.last
  return s * Math.pow(0.5, Math.max(0, now - at) / HALF_LIFE_MS)
}

function setWeakness(t: ErrTotals, v: number, now: number) {
  t.s = Math.round(v * 1000) / 1000
  t.sAt = now
}

export function logError(k: Kana, kind: ErrKind, src: ErrSource) {
  if (!KANA.includes(k)) return
  const log = loadErrorLog()
  const now = Date.now()
  const t = log.totals[k] ?? { w: 0, u: 0, last: 0 }
  setWeakness(t, weaknessNow(t, now) + 1, now)
  if (kind === 'wrong') t.w++
  else t.u++
  t.last = now
  log.totals[k] = t
  const ev: ErrEvent = { k, t: now, y: kind === 'wrong' ? 'w' : 'u', s: src }
  log.recent = [ev, ...log.recent].slice(0, RECENT_MAX)
  save(log)
}

/** にがて度を かける（よめた・クリアした ときに へらす） */
function scaleWeakness(ks: Kana[], factor: number) {
  const log = loadErrorLog()
  const now = Date.now()
  let changed = false
  for (const k of ks) {
    const t = log.totals[k]
    if (!t) continue
    setWeakness(t, weaknessNow(t, now) * factor, now)
    changed = true
  }
  if (changed) save(log)
}

/** マイクで ただしく よめた */
export const logCorrect = (k: Kana) => scaleWeakness([k], 0.8)
/** カンペキテストを クリアした 3もじ */
export const logCleared = (ks: Kana[]) => scaleWeakness(ks, 0.5)

/** ぜんぶ けす */
export function clearErrorLog() {
  save(empty())
}

/** 1もじだけ けす */
export function clearErrorFor(k: Kana) {
  const log = loadErrorLog()
  delete log.totals[k]
  log.recent = log.recent.filter((e) => e.k !== k)
  save(log)
}

export interface ErrRow {
  k: Kana
  w: number
  u: number
  total: number
  last: number
  /** いまの にがて度 */
  weak: number
}

/** いまの にがて度の たかい じゅん（おなじなら かいすうの おおい じゅん → さいきん まちがえた じゅん） */
export function rankedErrors(log = loadErrorLog()): ErrRow[] {
  const now = Date.now()
  return KANA.flatMap((k) => {
    const t = log.totals[k]
    return t && t.w + t.u > 0 ? [{ k, w: t.w, u: t.u, total: t.w + t.u, last: t.last, weak: weaknessNow(t, now) }] : []
  }).sort((a, b) => b.weak - a.weak || b.total - a.total || b.last - a.last)
}

/** 「これで ばっちり モード」に でる もじ（にがて度が WEAK_MIN いじょうの 上位） */
export function batchiriTargets(n = 3, log = loadErrorLog()): Kana[] {
  return rankedErrors(log)
    .filter((r) => r.weak >= WEAK_MIN)
    .slice(0, n)
    .map((r) => r.k)
}

export interface WeakPick {
  kana: Kana[]
  /** ログから えらんだ もじの かず（3 なら ぜんぶ ログから） */
  fromLog: number
}

/**
 * 「これで ばっちり モード」の 3もじ：ばっちりモードを はじめる たびに、その ときの「いまの にがて度」上位から えらぶ。
 * にがてな もじが たりないときは、まだ「よめたよ」に なっていない もじ（なければ ランダム）で うめる。
 */
export function pickWeak(n = 3): WeakPick {
  const top = batchiriTargets(n)
  const fromLog = top.length
  if (top.length < n) {
    const mastered = loadMastered()
    const rest = KANA.filter((k) => !top.includes(k))
      .map((k) => ({ k, m: mastered.has(k) ? 1 : 0, r: Math.random() }))
      .sort((a, b) => a.m - b.m || a.r - b.r)
    for (const x of rest) {
      if (top.length >= n) break
      top.push(x.k)
    }
  }
  return { kana: top, fromLog }
}

/**
 * 1もんごとに 1かいだけ きろくする ための たすけ（マイクの「まちがい」は 1もんで なんども くるので）
 * key が かわるまで おなじ もんだいの まちがいは かぞえない。
 */
export function onceper() {
  let lastKey: string | null = null
  return (key: string, fn: () => void) => {
    if (key === lastKey) return
    lastKey = key
    fn()
  }
}
