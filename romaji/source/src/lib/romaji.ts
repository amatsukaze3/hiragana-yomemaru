import { useSyncExternalStore } from 'react'
import { KANA_INFO, type Kana } from '../data/kana'
import { lsGet, lsSet } from './storage'

/**
 * ローマ字の つづり方
 *  - 'new'    … あたらしい ローマ字（令和7年 内閣告示第4号。shi・chi・tsu・fu・ji）※はじめは これ
 *  - 'kunrei' … 訓令式（si・ti・tu・hu・zi）。前の 教科書で ならっている 子むけ
 *  - 'both'   … あたらしい つづりを 大きく、訓令式を 小さく そえる（ちがう 文字だけ）
 * のばす音は どれも かなの とおりに 母音字を ならべる（こおり → koori、そうじき → soujiki）。
 * かなと ローマ字が 1つずつ たいおうするので、ひらがなが よめる 子が ひろい よみしやすい。
 * かたかなの「ー」だけは 母音字に ¯ を つける（へりこぷたー → herikoputā）。
 */
export type RomajiStyle = 'new' | 'kunrei' | 'both'
const STYLE_KEY = 'flora:style'

let style: RomajiStyle = (() => {
  const v = lsGet(STYLE_KEY)
  return v === 'kunrei' || v === 'both' ? v : 'new'
})()
const listeners = new Set<() => void>()

export const romajiStyle = () => style
export function setRomajiStyle(s: RomajiStyle) {
  style = s
  lsSet(STYLE_KEY, s)
  listeners.forEach((f) => f())
}
/** つづり方が かわったら 画面を かきなおす */
export function useRomajiStyle(): RomajiStyle {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => listeners.delete(f)
    },
    () => style,
  )
}

const KUNREI: Record<string, string> = { shi: 'si', chi: 'ti', tsu: 'tu', fu: 'hu', ji: 'zi', sha: 'sya', shu: 'syu', sho: 'syo', cha: 'tya', chu: 'tyu', cho: 'tyo', ja: 'zya', ju: 'zyu', jo: 'zyo' }

/** カード（1文字）に だす ローマ字。を は 1文字で だすときは wo（ことばの 中では o） */
export function cardRomaji(k: Kana, s: RomajiStyle = style): string {
  const r = KANA_INFO[k]?.romaji ?? k
  return s === 'kunrei' ? (KUNREI[r] ?? r) : r
}
/** 'both' のとき 小さく そえる 訓令式（ちがうときだけ） */
export function subRomaji(k: Kana, s: RomajiStyle = style): string | null {
  if (s !== 'both') return null
  const r = KANA_INFO[k]?.romaji ?? ''
  return KUNREI[r] ?? null
}
/** 行の なまえ（ka ki ku ke ko） */
export const rowRomaji = (kana: Kana[], s: RomajiStyle = style) => kana.map((k) => cardRomaji(k, s)).join(' ')

/* ---------- ことば（ひらがな）→ ローマ字 ---------- */

const BASE: Record<string, string> = {}
const add = (kana: string, roma: string) => [...kana].forEach((c, i) => (BASE[c] = roma.split(' ')[i]))
add('あいうえお', 'a i u e o')
add('かきくけこ', 'ka ki ku ke ko')
add('さしすせそ', 'sa shi su se so')
add('たちつてと', 'ta chi tsu te to')
add('なにぬねの', 'na ni nu ne no')
add('はひふへほ', 'ha hi fu he ho')
add('まみむめも', 'ma mi mu me mo')
add('やゆよ', 'ya yu yo')
add('らりるれろ', 'ra ri ru re ro')
add('わをん', 'wa o n')
add('がぎぐげご', 'ga gi gu ge go')
add('ざじずぜぞ', 'za ji zu ze zo')
add('だぢづでど', 'da ji zu de do')
add('ばびぶべぼ', 'ba bi bu be bo')
add('ぱぴぷぺぽ', 'pa pi pu pe po')
const SMALL_Y: Record<string, string> = { ゃ: 'a', ゅ: 'u', ょ: 'o' }
const MACRON: Record<string, string> = { a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' }
const toKata = (h: string) => String.fromCharCode(h.charCodeAt(0) + 0x60)

export interface Mora {
  kana: string // ひらがな（ちょ・たー など）
  roma: string
  /** 46もじの カードに あたる 文字（カタカナの キー）。だくてん・小さい字の ときは null */
  key: Kana | null
  space?: boolean
}

function youon(roma: string, small: string): string {
  // き + ゃ → kya、し + ゃ → sha、ち + ゃ → cha、じ + ゃ → ja
  const v = SMALL_Y[small]
  if (roma === 'shi') return 'sh' + v
  if (roma === 'chi') return 'ch' + v
  if (roma === 'ji') return 'j' + v
  return roma.slice(0, -1) + 'y' + v
}

/** ひらがなの ことばを モーラ（ローマ字の まとまり）に わける */
export function morae(word: string, s: RomajiStyle = style): Mora[] {
  const out: Mora[] = []
  const chars = [...word]
  let gem = false // っ のあと
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    if (c === ' ') {
      out.push({ kana: ' ', roma: ' ', key: null, space: true })
      continue
    }
    if (c === 'っ') {
      gem = true
      continue
    }
    if (c === 'ー') {
      const p = out[out.length - 1]
      if (p) {
        p.kana += 'ー'
        p.roma = p.roma.slice(0, -1) + (MACRON[p.roma.slice(-1)] ?? p.roma.slice(-1))
      }
      continue
    }
    let roma = BASE[c] ?? c
    let kana = c
    let key: Kana | null = c in BASE && 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.includes(c) ? toKata(c) : null
    if (chars[i + 1] && SMALL_Y[chars[i + 1]]) {
      roma = youon(roma, chars[i + 1])
      kana += chars[i + 1]
      key = null
      i++
    }
    if (s === 'kunrei') roma = KUNREI[roma] ?? roma
    // ん の あとに 母音・y が くるときは ' で わける（tan'i）
    const prev = out[out.length - 1]
    if (prev && prev.kana === 'ん' && /^[aiueoy]/.test(roma)) prev.roma = "n'"
    if (gem) {
      // っ は つぎの 子音字を かさねる（robotto）。小さい「っ」は カードに しない
      out.push({ kana: 'っ', roma: roma[0], key: null })
      gem = false
    }
    out.push({ kana, roma, key })
  }
  return out
}

/** ひらがなの ことばを ローマ字に */
export const wordRomaji = (word: string, s: RomajiStyle = style) =>
  morae(word, s)
    .map((m) => m.roma)
    .join('')
