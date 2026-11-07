import { KANA, KANA_INFO, ROWS, type Kana } from '../data/kana'
import { lsGet, lsSet } from '../lib/storage'

/**
 * よめ丸シューティングの「ことば」
 * よめ丸くんの 46 まいのカードの絵の名前（あ→あり、か→かめ …）をそのまま使う。
 * ことばの中の 46 もじ（清音）だけが カードになって ながれてくる。
 * だくてん・小さい字・のばす ぼう（ご ょ っ ー など）は よめ丸くんが よんでくれる（さいしょから うまっている）。
 */

const BASIC = new Set<string>(KANA)

export interface Letter {
  ch: string
  /** ながれてくる カードになるか（46もじのとき true） */
  play: boolean
}

export interface WordTask {
  /** スタンプの番号＝カードの文字 */
  id: Kana
  word: string
  letters: Letter[]
}

export function wordOf(id: Kana): WordTask {
  const word = KANA_INFO[id].word
  return { id, word, letters: [...word].map((ch) => ({ ch, play: BASIC.has(ch) })) }
}

/** ずかんの ならび（あ行 → わ行） */
export const STAMP_ORDER: Kana[] = ROWS.flatMap((r) => r.kana)
export const STAMP_TOTAL = STAMP_ORDER.length // 46

/* ---------- スタンプの保存 ---------- */

const STAMP_KEY = 'yomemaru:shoot:stamps'

export function loadStamps(): Set<Kana> {
  try {
    const arr = JSON.parse(lsGet(STAMP_KEY) ?? '[]') as string[]
    return new Set(arr.filter((k) => BASIC.has(k)))
  } catch {
    return new Set()
  }
}

export function saveStamps(s: Set<Kana>) {
  lsSet(STAMP_KEY, JSON.stringify([...s]))
}

/* ---------- モード ---------- */

export type ModeId = 'normal' | 'fast'

export interface Mode {
  id: ModeId
  name: string
  /** せつめい（1ぎょうずつ。ことばの とちゅうで 改行しないように わけておく） */
  sub: string[]
  /** さいしょに 上から下まで おちる秒数 */
  startSec: number
  /** いちばん はやいときの秒数 */
  minSec: number
  /** この秒数ごとに おちる時間が はんぶんになる */
  halfLife: number
}

export const MODES: Record<ModeId, Mode> = {
  normal: { id: 'normal', name: 'ふつう モード', sub: ['ゆっくり はじまって', 'だんだん はやくなるよ'], startSec: 12, minSec: 5, halfLife: 150 },
  fast: { id: 'fast', name: 'はやい モード', sub: ['まんなかの はやさから', 'ぐんぐん はやくなるよ！'], startSec: 7.5, minSec: 2.6, halfLife: 75 },
}

/** あそんだ時間（秒）から、いまの おちる秒数 */
export function fallSecAt(mode: Mode, t: number) {
  return Math.max(mode.minSec, mode.startSec * Math.pow(0.5, t / mode.halfLife))
}

/** スピードの だんかい（1〜5）。画面の ★ に使う */
export function speedLevel(mode: Mode, t: number) {
  const ref = MODES.normal
  const sec = fallSecAt(mode, t)
  // ふつうモードの さいしょ（13秒）を ★1、2.6秒を ★5 とする
  const r = Math.log(ref.startSec / sec) / Math.log(ref.startSec / MODES.fast.minSec)
  return Math.max(1, Math.min(5, 1 + Math.round(r * 4)))
}

const bestKey = (m: ModeId) => `yomemaru:shoot:best:${m}`
export function getBestScore(m: ModeId): number {
  const v = Number(lsGet(bestKey(m)))
  return Number.isFinite(v) && v > 0 ? v : 0
}
export function setBestScore(m: ModeId, v: number) {
  lsSet(bestKey(m), String(v))
}

/**
 * つぎに だす ことばを えらぶ。
 * まだ もっていない スタンプを 8わり、もっているものを 2わり。いま でている ことばは さける。
 */
export function pickWord(stamps: Set<Kana>, avoid: Set<Kana>, recent: Kana[]): WordTask {
  const all = STAMP_ORDER.filter((k) => !avoid.has(k))
  const fresh = all.filter((k) => !stamps.has(k) && !recent.includes(k))
  const owned = all.filter((k) => stamps.has(k) && !recent.includes(k))
  let pool = fresh.length && (Math.random() < 0.8 || !owned.length) ? fresh : owned
  if (!pool.length) pool = all.length ? all : STAMP_ORDER
  return wordOf(pool[Math.floor(Math.random() * pool.length)])
}

/* ---------- とちゅうセーブ ---------- */

export interface SaveData {
  v: 1
  mode: ModeId
  /** あそんだ秒数（スピードの つづきに つかう） */
  elapsed: number
  score: number
  lives: number
  /** とちゅうの ことば（とれた もじ） */
  words: { id: Kana; got: boolean[] }[]
  /** この回に ゲットした スタンプ */
  round: { id: Kana; isNew: boolean }[]
  savedAt: number
}

const SAVE_KEY = 'yomemaru:shoot:save'

export function loadSave(): SaveData | null {
  try {
    const d = JSON.parse(lsGet(SAVE_KEY) ?? 'null') as SaveData | null
    if (!d || d.v !== 1 || !(d.mode in MODES) || !(d.lives > 0)) return null
    d.words = (d.words ?? []).filter((w) => BASIC.has(w.id) && Array.isArray(w.got) && w.got.length === [...KANA_INFO[w.id].word].length)
    d.round = (d.round ?? []).filter((r) => BASIC.has(r.id))
    return d
  } catch {
    return null
  }
}

export function writeSave(d: SaveData) {
  lsSet(SAVE_KEY, JSON.stringify(d))
}

export function clearSave() {
  lsSet(SAVE_KEY, '')
}
