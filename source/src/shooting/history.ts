import { KANA, type Kana } from '../data/kana'
import { lsGet, lsSet } from '../lib/storage'

/**
 * シューティングの きろく（もじ ごと）。
 * 「これで ばっちり モード」で にがてな もじを えらぶのに つかう。
 */
export interface KanaStat {
  /** マイクで よめた かい */
  got: number
  /** したまで おとした かい */
  miss: number
  /** よめたけど じかんが かかった（ねらわれてから 3.5びょう いじょう）かい */
  slow: number
  /** ばっちりモードで れんしゅうした かい */
  practiced: number
}

const KEY = 'yomemaru:shoot:history'
export const SLOW_MS = 3500

type History = Partial<Record<Kana, KanaStat>>

export function loadHistory(): History {
  try {
    return (JSON.parse(lsGet(KEY) ?? '{}') as History) ?? {}
  } catch {
    return {}
  }
}

function update(k: Kana, fn: (s: KanaStat) => void) {
  const h = loadHistory()
  const s = h[k] ?? { got: 0, miss: 0, slow: 0, practiced: 0 }
  fn(s)
  h[k] = s
  lsSet(KEY, JSON.stringify(h))
}

export const recordGot = (k: Kana, ms: number) =>
  update(k, (s) => {
    s.got++
    if (ms >= SLOW_MS) s.slow++
  })
export const recordMiss = (k: Kana) => update(k, (s) => s.miss++)
export const recordPracticed = (k: Kana) => update(k, (s) => s.practiced++)

/** にがて ど（おおきいほど にがて）。おとした かいすうを おもく、おそかった かいすうを かるく みる */
function weakness(s: KanaStat) {
  const tries = s.got + s.miss
  return (s.miss * 2 + s.slow + 0.5) / (tries + 2) - s.practiced * 0.12
}

export interface WeakPick {
  kana: Kana[]
  /** シューティングの きろくから えらんだ もじの かず（3 なら ぜんぶ きろくから） */
  fromHistory: number
}

/**
 * にがてな もじを n こ えらぶ。
 * きろくが ある もじの なかで にがて ど が たかい じゅん。
 * きろくが たりないときは、まだ あまり でてきていない もじで うめる。
 */
export function pickWeak(n = 3): WeakPick {
  const h = loadHistory()
  const withData = KANA.filter((k) => {
    const s = h[k]
    return s && s.got + s.miss > 0
  })
    .map((k) => ({ k, w: weakness(h[k]!) }))
    // じょうずに よめている もじ（にがて ど が ひくい）は えらばない
    .filter((x) => x.w > 0.2)
    .sort((a, b) => b.w - a.w)
  const out = withData.slice(0, n).map((x) => x.k)
  const fromHistory = out.length
  if (out.length < n) {
    const rest = KANA.filter((k) => !out.includes(k))
      .map((k) => ({ k, t: (h[k]?.got ?? 0) + (h[k]?.miss ?? 0) + (h[k]?.practiced ?? 0), r: Math.random() }))
      .sort((a, b) => a.t - b.t || a.r - b.r)
    for (const x of rest) {
      if (out.length >= n) break
      out.push(x.k)
    }
  }
  return { kana: out, fromHistory }
}
