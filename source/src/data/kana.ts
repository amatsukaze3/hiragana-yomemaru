import aImg from '../assets/cards/a.webp'
import iImg from '../assets/cards/i.webp'
import uImg from '../assets/cards/u.webp'
import eImg from '../assets/cards/e.webp'
import oImg from '../assets/cards/o.webp'

export type Kana = 'あ' | 'い' | 'う' | 'え' | 'お'

export const KANA: Kana[] = ['あ', 'い', 'う', 'え', 'お']

export interface KanaInfo {
  char: Kana
  romaji: string
  word: string // 絵の名前
  strokes: number // 画数
  /** なぞり書きの書きはじめ位置（なぞり枠に対する割合 0〜1） */
  strokeStarts: [number, number][]
  /** 既定のカード絵（添付カードから文字を取り除いた線画） */
  image: string
  imageAspect: number // 幅 / 高さ
  /** 絵の上に重ねる文字の位置（%）と大きさ（絵の高さに対する %） */
  letter: { cx: number; cy: number; h: number }
}

export const KANA_INFO: Record<Kana, KanaInfo> = {
  あ: {
    char: 'あ', romaji: 'a', word: 'あり', strokes: 3,
    strokeStarts: [[0.27, 0.3], [0.44, 0.17], [0.62, 0.4]],
    image: aImg, imageAspect: 621 / 765,
    letter: { cx: 50.1, cy: 49.7, h: 44.4 },
  },
  い: {
    char: 'い', romaji: 'i', word: 'いちご', strokes: 2,
    strokeStarts: [[0.3, 0.26], [0.66, 0.34]],
    image: iImg, imageAspect: 621 / 768,
    letter: { cx: 49.4, cy: 55.4, h: 40.8 },
  },
  う: {
    char: 'う', romaji: 'u', word: 'うさぎ', strokes: 2,
    strokeStarts: [[0.4, 0.16], [0.3, 0.42]],
    image: uImg, imageAspect: 799 / 768,
    letter: { cx: 50.9, cy: 57.9, h: 54.2 },
  },
  え: {
    char: 'え', romaji: 'e', word: 'えんぴつ', strokes: 2,
    strokeStarts: [[0.41, 0.16], [0.28, 0.42]],
    image: eImg, imageAspect: 1239 / 507,
    letter: { cx: 50.4, cy: 49.4, h: 66.9 },
  },
  お: {
    char: 'お', romaji: 'o', word: 'おにぎり', strokes: 3,
    strokeStarts: [[0.24, 0.32], [0.44, 0.16], [0.68, 0.27]],
    image: oImg, imageAspect: 855 / 767,
    letter: { cx: 50.2, cy: 50, h: 48 }, // ほかのカードと同じ大きさ（のりに重なってよい）
  },
}

/**
 * スマートシャッフル：直前と同じ文字が続かないように n 個並べる。
 * avoidFirst を渡すと、1問目がその文字にならないようにする。
 */
export function smartShuffle(n: number, avoidFirst?: Kana): Kana[] {
  const out: Kana[] = []
  let pool: Kana[] = []
  while (out.length < n) {
    if (pool.length === 0) pool = shuffle([...KANA])
    const prev = out.length ? out[out.length - 1] : avoidFirst
    let k = pool.findIndex((c) => c !== prev)
    if (k < 0) {
      // 残りが直前と同じ文字だけ → 新しい山を混ぜて回避
      pool = [...pool, ...shuffle([...KANA])]
      k = pool.findIndex((c) => c !== prev)
    }
    out.push(pool.splice(k, 1)[0])
  }
  return out
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
