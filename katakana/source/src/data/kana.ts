import aImg from '../assets/cards/a.webp'
import iImg from '../assets/cards/i.webp'
import uImg from '../assets/cards/u.webp'
import eImg from '../assets/cards/e.webp'
import oImg from '../assets/cards/o.webp'
import kaImg from '../assets/cards/ka.webp'
import kiImg from '../assets/cards/ki.webp'
import kuImg from '../assets/cards/ku.webp'
import keImg from '../assets/cards/ke.webp'
import koImg from '../assets/cards/ko.webp'
import saImg from '../assets/cards/sa.webp'
import shiImg from '../assets/cards/shi.webp'
import suImg from '../assets/cards/su.webp'
import seImg from '../assets/cards/se.webp'
import soImg from '../assets/cards/so.webp'
import taImg from '../assets/cards/ta.webp'
import chiImg from '../assets/cards/chi.webp'
import tsuImg from '../assets/cards/tsu.webp'
import teImg from '../assets/cards/te.webp'
import toImg from '../assets/cards/to.webp'
import naImg from '../assets/cards/na.webp'
import niImg from '../assets/cards/ni.webp'
import nuImg from '../assets/cards/nu.webp'
import neImg from '../assets/cards/ne.webp'
import noImg from '../assets/cards/no.webp'
import haImg from '../assets/cards/ha.webp'
import hiImg from '../assets/cards/hi.webp'
import fuImg from '../assets/cards/fu.webp'
import heImg from '../assets/cards/he.webp'
import hoImg from '../assets/cards/ho.webp'
import maImg from '../assets/cards/ma.webp'
import miImg from '../assets/cards/mi.webp'
import muImg from '../assets/cards/mu.webp'
import meImg from '../assets/cards/me.webp'
import moImg from '../assets/cards/mo.webp'
import yaImg from '../assets/cards/ya.webp'
import yuImg from '../assets/cards/yu.webp'
import yoImg from '../assets/cards/yo.webp'
import raImg from '../assets/cards/ra.webp'
import riImg from '../assets/cards/ri.webp'
import ruImg from '../assets/cards/ru.webp'
import reImg from '../assets/cards/re.webp'
import roImg from '../assets/cards/ro.webp'
import waImg from '../assets/cards/wa.webp'
import woImg from '../assets/cards/wo.webp'
import nImg from '../assets/cards/n.webp'

export type Kana = string
/** 音読判定に使う母音（判定エンジンの中では ひらがなで あつかう） */
export type Vowel = 'あ' | 'い' | 'う' | 'え' | 'お'

export interface Row {
  id: string
  name: string // ア行
  kana: Kana[]
}

export const ROWS: Row[] = [
  { id: 'a', name: 'ア行', kana: ['ア', 'イ', 'ウ', 'エ', 'オ'] },
  { id: 'ka', name: 'カ行', kana: ['カ', 'キ', 'ク', 'ケ', 'コ'] },
  { id: 'sa', name: 'サ行', kana: ['サ', 'シ', 'ス', 'セ', 'ソ'] },
  { id: 'ta', name: 'タ行', kana: ['タ', 'チ', 'ツ', 'テ', 'ト'] },
  { id: 'na', name: 'ナ行', kana: ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'] },
  { id: 'ha', name: 'ハ行', kana: ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'] },
  { id: 'ma', name: 'マ行', kana: ['マ', 'ミ', 'ム', 'メ', 'モ'] },
  { id: 'ya', name: 'ヤ行', kana: ['ヤ', 'ユ', 'ヨ'] },
  { id: 'ra', name: 'ラ行', kana: ['ラ', 'リ', 'ル', 'レ', 'ロ'] },
  { id: 'wa', name: 'ワ行', kana: ['ワ', 'ヲ', 'ン'] },
]

export const KANA: Kana[] = ROWS.flatMap((r) => r.kana)

export interface KanaInfo {
  char: Kana
  romaji: string
  word: string // 絵の名前
  vowel: Vowel // 音読判定に使う母音
  strokes: number // 画数
  /** なぞり書きの書きはじめ位置（字形の外枠に対する割合 0〜1） */
  strokeStarts: [number, number][]
  /** 既定のカード絵（添付カードから文字を取り除いた線画） */
  image: string
  imageAspect: number // 幅 / 高さ
  /** 絵の上に重ねる文字の位置（%）と大きさ（絵の高さに対する %） */
  letter: { cx: number; cy: number; h: number }
  /** 白い背景のカード（文字を消したカード） */
  framed?: boolean
  /** 絵の中の小さなことば */
  labels?: { text: string; cx: number; cy: number; h: number }[]
}

export const KANA_INFO: Record<Kana, KanaInfo> = {
  ア: { char: 'ア', romaji: 'a', word: 'アイス', vowel: 'あ', strokes: 2, strokeStarts: [[0.08, 0.1], [0.5, 0.42]], image: aImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.1, cy: 52.0, h: 43.0 } },
  イ: { char: 'イ', romaji: 'i', word: 'インコ', vowel: 'い', strokes: 2, strokeStarts: [[0.85, 0.03], [0.55, 0.42]], image: iImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.0, cy: 48.7, h: 43.0 } },
  ウ: { char: 'ウ', romaji: 'u', word: 'ウクレレ', vowel: 'う', strokes: 3, strokeStarts: [[0.5, 0.02], [0.08, 0.28], [0.3, 0.2]], image: uImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.6, cy: 50.4, h: 43.0 } },
  エ: { char: 'エ', romaji: 'e', word: 'エプロン', vowel: 'え', strokes: 3, strokeStarts: [[0.12, 0.08], [0.5, 0.15], [0.02, 0.92]], image: eImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 57.5, h: 43.0 } },
  オ: { char: 'オ', romaji: 'o', word: 'オレンジ', vowel: 'お', strokes: 3, strokeStarts: [[0.03, 0.3], [0.62, 0.03], [0.42, 0.42]], image: oImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.4, cy: 53.4, h: 43.0 } },
  カ: { char: 'カ', romaji: 'ka', word: 'カメラ', vowel: 'あ', strokes: 2, strokeStarts: [[0.08, 0.28], [0.4, 0.03]], image: kaImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.6, cy: 50.8, h: 43.0 } },
  キ: { char: 'キ', romaji: 'ki', word: 'キャベツ', vowel: 'い', strokes: 3, strokeStarts: [[0.1, 0.25], [0.03, 0.58], [0.42, 0.03]], image: kiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.8, cy: 44.6, h: 43.0 } },
  ク: { char: 'ク', romaji: 'ku', word: 'クレヨン', vowel: 'う', strokes: 2, strokeStarts: [[0.42, 0.03], [0.32, 0.2]], image: kuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.9, cy: 46.9, h: 43.0 } },
  ケ: { char: 'ケ', romaji: 'ke', word: 'ケーキ', vowel: 'え', strokes: 3, strokeStarts: [[0.3, 0.03], [0.32, 0.36], [0.66, 0.38]], image: keImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.8, cy: 50.2, h: 43.0 } },
  コ: { char: 'コ', romaji: 'ko', word: 'コアラ', vowel: 'お', strokes: 2, strokeStarts: [[0.06, 0.06], [0.06, 0.94]], image: koImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.2, cy: 51.6, h: 43.0 } },
  サ: { char: 'サ', romaji: 'sa', word: 'サンドイッチ', vowel: 'あ', strokes: 3, strokeStarts: [[0.02, 0.32], [0.28, 0.03], [0.7, 0.03]], image: saImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.4, cy: 52.4, h: 43.0 } },
  シ: { char: 'シ', romaji: 'shi', word: 'シーソー', vowel: 'い', strokes: 3, strokeStarts: [[0.1, 0.06], [0.03, 0.42], [0.1, 0.94]], image: shiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.3, cy: 48.8, h: 43.0 } },
  ス: { char: 'ス', romaji: 'su', word: 'スプーン', vowel: 'う', strokes: 2, strokeStarts: [[0.1, 0.1], [0.58, 0.56]], image: suImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.9, cy: 50.3, h: 43.0 } },
  セ: { char: 'セ', romaji: 'se', word: 'セーター', vowel: 'え', strokes: 2, strokeStarts: [[0.02, 0.42], [0.35, 0.03]], image: seImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.6, cy: 48.8, h: 43.0 } },
  ソ: { char: 'ソ', romaji: 'so', word: 'ソーセージ', vowel: 'お', strokes: 2, strokeStarts: [[0.05, 0.12], [0.85, 0.05]], image: soImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.8, cy: 52.6, h: 43.0 } },
  タ: { char: 'タ', romaji: 'ta', word: 'タクシー', vowel: 'あ', strokes: 3, strokeStarts: [[0.4, 0.03], [0.32, 0.2], [0.35, 0.52]], image: taImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.4, cy: 48.8, h: 43.0 } },
  チ: { char: 'チ', romaji: 'chi', word: 'チーズ', vowel: 'い', strokes: 3, strokeStarts: [[0.8, 0.03], [0.02, 0.42], [0.5, 0.22]], image: chiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.9, cy: 49.1, h: 43.0 } },
  ツ: { char: 'ツ', romaji: 'tsu', word: 'ツバメ', vowel: 'う', strokes: 3, strokeStarts: [[0.05, 0.18], [0.4, 0.06], [0.9, 0.06]], image: tsuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.6, cy: 52.2, h: 43.0 } },
  テ: { char: 'テ', romaji: 'te', word: 'テレビ', vowel: 'え', strokes: 3, strokeStarts: [[0.12, 0.06], [0.02, 0.42], [0.5, 0.45]], image: teImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 54.6, h: 43.0 } },
  ト: { char: 'ト', romaji: 'to', word: 'トマト', vowel: 'お', strokes: 2, strokeStarts: [[0.2, 0.03], [0.25, 0.45]], image: toImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 53.1, cy: 51.2, h: 43.0 } },
  ナ: { char: 'ナ', romaji: 'na', word: 'ナイフ', vowel: 'あ', strokes: 2, strokeStarts: [[0.02, 0.32], [0.55, 0.03]], image: naImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.8, cy: 47.0, h: 43.0 } },
  ニ: { char: 'ニ', romaji: 'ni', word: 'ニワトリ', vowel: 'い', strokes: 2, strokeStarts: [[0.1, 0.1], [0.02, 0.9]], image: niImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 59.7, h: 43.0 } },
  ヌ: { char: 'ヌ', romaji: 'nu', word: 'ヌードル', vowel: 'う', strokes: 2, strokeStarts: [[0.1, 0.08], [0.3, 0.48]], image: nuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.8, cy: 52.3, h: 43.0 } },
  ネ: { char: 'ネ', romaji: 'ne', word: 'ネクタイ', vowel: 'え', strokes: 4, strokeStarts: [[0.45, 0.03], [0.1, 0.3], [0.5, 0.52], [0.72, 0.56]], image: neImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.9, cy: 49.8, h: 43.0 } },
  ノ: { char: 'ノ', romaji: 'no', word: 'ノート', vowel: 'お', strokes: 1, strokeStarts: [[0.9, 0.05]], image: noImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.0, h: 43.0 } },
  ハ: { char: 'ハ', romaji: 'ha', word: 'ハンバーガー', vowel: 'あ', strokes: 2, strokeStarts: [[0.35, 0.06], [0.65, 0.06]], image: haImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.9, cy: 50.5, h: 43.0 } },
  ヒ: { char: 'ヒ', romaji: 'hi', word: 'ヒマワリ', vowel: 'い', strokes: 2, strokeStarts: [[0.15, 0.42], [0.1, 0.03]], image: hiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 51.0, cy: 51.3, h: 43.0 } },
  フ: { char: 'フ', romaji: 'fu', word: 'フラミンゴ', vowel: 'う', strokes: 1, strokeStarts: [[0.05, 0.1]], image: fuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.6, cy: 50.0, h: 43.0 } },
  ヘ: { char: 'ヘ', romaji: 'he', word: 'ヘルメット', vowel: 'え', strokes: 1, strokeStarts: [[0.02, 0.62]], image: heImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 55.1, cy: 43.1, h: 43.0 } },
  ホ: { char: 'ホ', romaji: 'ho', word: 'ホットケーキ', vowel: 'お', strokes: 4, strokeStarts: [[0.05, 0.3], [0.5, 0.03], [0.2, 0.56], [0.75, 0.56]], image: hoImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.3, cy: 49.6, h: 43.0 } },
  マ: { char: 'マ', romaji: 'ma', word: 'マフラー', vowel: 'あ', strokes: 2, strokeStarts: [[0.05, 0.1], [0.45, 0.56]], image: maImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.4, cy: 52.2, h: 43.0 } },
  ミ: { char: 'ミ', romaji: 'mi', word: 'ミルク', vowel: 'い', strokes: 3, strokeStarts: [[0.1, 0.06], [0.15, 0.42], [0.05, 0.76]], image: miImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.3, cy: 51.1, h: 43.0 } },
  ム: { char: 'ム', romaji: 'mu', word: 'ムササビ', vowel: 'う', strokes: 2, strokeStarts: [[0.4, 0.03], [0.75, 0.62]], image: muImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 47.9, h: 43.0 } },
  メ: { char: 'メ', romaji: 'me', word: 'メガネ', vowel: 'え', strokes: 2, strokeStarts: [[0.8, 0.03], [0.25, 0.35]], image: meImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.7, cy: 47.4, h: 43.0 } },
  モ: { char: 'モ', romaji: 'mo', word: 'モンスター', vowel: 'お', strokes: 3, strokeStarts: [[0.15, 0.08], [0.02, 0.46], [0.42, 0.03]], image: moImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 48.3, h: 43.0 } },
  ヤ: { char: 'ヤ', romaji: 'ya', word: 'ヤギ', vowel: 'あ', strokes: 2, strokeStarts: [[0.02, 0.36], [0.35, 0.03]], image: yaImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.4, cy: 50.5, h: 43.0 } },
  ユ: { char: 'ユ', romaji: 'yu', word: 'ユニコーン', vowel: 'う', strokes: 2, strokeStarts: [[0.1, 0.2], [0.02, 0.9]], image: yuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.8, cy: 51.5, h: 43.0 } },
  ヨ: { char: 'ヨ', romaji: 'yo', word: 'ヨーグルト', vowel: 'お', strokes: 3, strokeStarts: [[0.1, 0.06], [0.15, 0.48], [0.05, 0.93]], image: yoImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 47.3, cy: 50.9, h: 43.0 } },
  ラ: { char: 'ラ', romaji: 'ra', word: 'ランドセル', vowel: 'あ', strokes: 2, strokeStarts: [[0.15, 0.05], [0.05, 0.36]], image: raImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.1, cy: 49.6, h: 43.0 } },
  リ: { char: 'リ', romaji: 'ri', word: 'リボン', vowel: 'い', strokes: 2, strokeStarts: [[0.15, 0.05], [0.8, 0.03]], image: riImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.1, cy: 49.9, h: 43.0 } },
  ル: { char: 'ル', romaji: 'ru', word: 'ルーレット', vowel: 'う', strokes: 2, strokeStarts: [[0.3, 0.06], [0.62, 0.03]], image: ruImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.3, cy: 48.1, h: 43.0 } },
  レ: { char: 'レ', romaji: 're', word: 'レモン', vowel: 'え', strokes: 1, strokeStarts: [[0.12, 0.03]], image: reImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.4, cy: 58.8, h: 43.0 } },
  ロ: { char: 'ロ', romaji: 'ro', word: 'ロケット', vowel: 'お', strokes: 3, strokeStarts: [[0.05, 0.12], [0.22, 0.04], [0.15, 0.95]], image: roImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 44.8, h: 43.0 } },
  ワ: { char: 'ワ', romaji: 'wa', word: 'ワッフル', vowel: 'あ', strokes: 2, strokeStarts: [[0.05, 0.1], [0.28, 0.04]], image: waImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 53.1, h: 43.0 } },
  ヲ: { char: 'ヲ', romaji: 'wo', word: 'パンヲタベル', vowel: 'お', strokes: 3, strokeStarts: [[0.05, 0.05], [0.05, 0.42], [0.9, 0.06]], image: woImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 43.9, cy: 47.8, h: 43.0 } },
  ン: { char: 'ン', romaji: 'n', word: 'プリン', vowel: 'う', strokes: 2, strokeStarts: [[0.06, 0.15], [0.1, 0.94]], image: nImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.8, cy: 48.4, h: 43.0 } },
}

/**
 * スマートシャッフル：直前と同じ文字が続かないように n 個並べる。
 * avoidFirst を渡すと、1問目がその文字にならないようにする。
 */
export function smartShuffle(n: number, list: Kana[], avoidFirst?: Kana): Kana[] {
  const out: Kana[] = []
  let pool: Kana[] = []
  while (out.length < n) {
    if (pool.length === 0) pool = shuffle([...list])
    const prev = out.length ? out[out.length - 1] : avoidFirst
    let k = pool.findIndex((c) => c !== prev)
    if (k < 0) {
      // 残りが直前と同じ文字だけ → 新しい山を混ぜて回避
      pool = [...pool, ...shuffle([...list])]
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
