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
export type Vowel = 'あ' | 'い' | 'う' | 'え' | 'お'

export interface Row {
  id: string
  name: string // あ行
  kana: Kana[]
}

export const ROWS: Row[] = [
  { id: 'a', name: 'あ行', kana: ['あ', 'い', 'う', 'え', 'お'] },
  { id: 'ka', name: 'か行', kana: ['か', 'き', 'く', 'け', 'こ'] },
  { id: 'sa', name: 'さ行', kana: ['さ', 'し', 'す', 'せ', 'そ'] },
  { id: 'ta', name: 'た行', kana: ['た', 'ち', 'つ', 'て', 'と'] },
  { id: 'na', name: 'な行', kana: ['な', 'に', 'ぬ', 'ね', 'の'] },
  { id: 'ha', name: 'は行', kana: ['は', 'ひ', 'ふ', 'へ', 'ほ'] },
  { id: 'ma', name: 'ま行', kana: ['ま', 'み', 'む', 'め', 'も'] },
  { id: 'ya', name: 'や行', kana: ['や', 'ゆ', 'よ'] },
  { id: 'ra', name: 'ら行', kana: ['ら', 'り', 'る', 'れ', 'ろ'] },
  { id: 'wa', name: 'わ行', kana: ['わ', 'を', 'ん'] },
]

export const KANA: Kana[] = ROWS.flatMap((r) => r.kana)

export interface KanaInfo {
  char: Kana
  romaji: string
  word: string // 絵の名前
  vowel: Vowel // 音読判定に使う母音
  strokes: number // 画数
  /** なぞり書きの書きはじめ位置（なぞり枠に対する割合 0〜1） */
  strokeStarts: [number, number][]
  /** 既定のカード絵（添付カードから文字を取り除いた線画） */
  image: string
  imageAspect: number // 幅 / 高さ
  /** 絵の上に重ねる文字の位置（%）と大きさ（絵の高さに対する %） */
  letter: { cx: number; cy: number; h: number }
  /** 白い背景のカード（文字を消したカード）。あ行は線画だけ */
  framed?: boolean
  /** 絵の中の小さなことば（を：ほん・よむ、ん：きり） */
  labels?: { text: string; cx: number; cy: number; h: number }[]
}

export const KANA_INFO: Record<Kana, KanaInfo> = {
  か: { char: 'か', romaji: 'ka', word: 'かめ', vowel: 'あ', strokes: 3, strokeStarts: [[0.1, 0.3], [0.38, 0.05], [0.8, 0.28]], image: kaImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.2, cy: 43.2, h: 43.0 }, labels: [] },
  き: { char: 'き', romaji: 'ki', word: 'きつね', vowel: 'い', strokes: 4, strokeStarts: [[0.2, 0.2], [0.15, 0.42], [0.4, 0.02], [0.25, 0.75]], image: kiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.9, cy: 44.7, h: 43.0 }, labels: [] },
  く: { char: 'く', romaji: 'ku', word: 'くるま', vowel: 'う', strokes: 1, strokeStarts: [[0.75, 0.02]], image: kuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.5, cy: 46.0, h: 43.0 }, labels: [] },
  け: { char: 'け', romaji: 'ke', word: 'けしごむ', vowel: 'え', strokes: 3, strokeStarts: [[0.12, 0.1], [0.45, 0.35], [0.75, 0.05]], image: keImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.6, cy: 50.5, h: 43.0 }, labels: [] },
  こ: { char: 'こ', romaji: 'ko', word: 'こおり', vowel: 'お', strokes: 2, strokeStarts: [[0.2, 0.1], [0.1, 0.65]], image: koImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.6, h: 43.0 }, labels: [] },
  さ: { char: 'さ', romaji: 'sa', word: 'さかな', vowel: 'あ', strokes: 3, strokeStarts: [[0.15, 0.25], [0.45, 0.02], [0.25, 0.7]], image: saImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.2, cy: 50.1, h: 43.0 }, labels: [] },
  し: { char: 'し', romaji: 'shi', word: 'しんかんせん', vowel: 'い', strokes: 1, strokeStarts: [[0.3, 0.02]], image: shiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 52.6, cy: 49.9, h: 43.0 }, labels: [] },
  す: { char: 'す', romaji: 'su', word: 'すいか', vowel: 'う', strokes: 2, strokeStarts: [[0.05, 0.25], [0.55, 0.02]], image: suImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.5, cy: 43.3, h: 43.0 }, labels: [] },
  せ: { char: 'せ', romaji: 'se', word: 'せみ', vowel: 'え', strokes: 3, strokeStarts: [[0.05, 0.4], [0.7, 0.05], [0.3, 0.05]], image: seImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 46.7, h: 43.0 }, labels: [] },
  そ: { char: 'そ', romaji: 'so', word: 'そうじき', vowel: 'お', strokes: 1, strokeStarts: [[0.25, 0.05]], image: soImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 47.6, cy: 50.3, h: 43.0 }, labels: [] },
  た: { char: 'た', romaji: 'ta', word: 'たいよう', vowel: 'あ', strokes: 4, strokeStarts: [[0.1, 0.25], [0.35, 0.02], [0.6, 0.45], [0.55, 0.8]], image: taImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.5, cy: 49.3, h: 43.0 }, labels: [] },
  ち: { char: 'ち', romaji: 'chi', word: 'ちょうちょ', vowel: 'い', strokes: 2, strokeStarts: [[0.1, 0.25], [0.4, 0.02]], image: chiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.5, cy: 49.1, h: 43.0 }, labels: [] },
  つ: { char: 'つ', romaji: 'tsu', word: 'つき', vowel: 'う', strokes: 1, strokeStarts: [[0.05, 0.35]], image: tsuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.6, cy: 49.1, h: 43.0 }, labels: [] },
  て: { char: 'て', romaji: 'te', word: 'てんとうむし', vowel: 'え', strokes: 1, strokeStarts: [[0.05, 0.15]], image: teImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.6, cy: 54.1, h: 43.0 }, labels: [] },
  と: { char: 'と', romaji: 'to', word: 'とら', vowel: 'お', strokes: 2, strokeStarts: [[0.3, 0.05], [0.75, 0.3]], image: toImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.2, cy: 49.6, h: 43.0 }, labels: [] },
  な: { char: 'な', romaji: 'na', word: 'なす', vowel: 'あ', strokes: 4, strokeStarts: [[0.1, 0.25], [0.35, 0.02], [0.8, 0.3], [0.6, 0.4]], image: naImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.8, cy: 50.0, h: 43.0 }, labels: [] },
  に: { char: 'に', romaji: 'ni', word: 'にんじん', vowel: 'い', strokes: 3, strokeStarts: [[0.15, 0.05], [0.5, 0.25], [0.45, 0.7]], image: niImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.8, cy: 55.2, h: 43.0 }, labels: [] },
  ぬ: { char: 'ぬ', romaji: 'nu', word: 'ぬいぐるみ', vowel: 'う', strokes: 2, strokeStarts: [[0.15, 0.25], [0.5, 0.05]], image: nuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.4, cy: 48.9, h: 43.0 }, labels: [] },
  ね: { char: 'ね', romaji: 'ne', word: 'ねこ', vowel: 'え', strokes: 2, strokeStarts: [[0.3, 0.02], [0.05, 0.3]], image: neImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.7, cy: 48.7, h: 43.0 }, labels: [] },
  の: { char: 'の', romaji: 'no', word: 'のり', vowel: 'お', strokes: 1, strokeStarts: [[0.5, 0.2]], image: noImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 40.1, cy: 49.8, h: 43.0 }, labels: [] },
  は: { char: 'は', romaji: 'ha', word: 'はさみ', vowel: 'あ', strokes: 3, strokeStarts: [[0.15, 0.05], [0.45, 0.3], [0.7, 0.05]], image: haImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.2, cy: 49.1, h: 43.0 }, labels: [] },
  ひ: { char: 'ひ', romaji: 'hi', word: 'ひこうき', vowel: 'い', strokes: 1, strokeStarts: [[0.05, 0.15]], image: hiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.9, h: 43.0 }, labels: [] },
  ふ: { char: 'ふ', romaji: 'fu', word: 'ふうせん', vowel: 'う', strokes: 4, strokeStarts: [[0.45, 0.05], [0.4, 0.35], [0.05, 0.75], [0.85, 0.6]], image: fuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.1, h: 43.0 }, labels: [] },
  へ: { char: 'へ', romaji: 'he', word: 'へりこぷたー', vowel: 'え', strokes: 1, strokeStarts: [[0.05, 0.6]], image: heImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.5, h: 43.0 }, labels: [] },
  ほ: { char: 'ほ', romaji: 'ho', word: 'ほし', vowel: 'お', strokes: 4, strokeStarts: [[0.12, 0.05], [0.45, 0.1], [0.45, 0.4], [0.7, 0.1]], image: hoImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.2, h: 43.0 }, labels: [] },
  ま: { char: 'ま', romaji: 'ma', word: 'まくら', vowel: 'あ', strokes: 3, strokeStarts: [[0.15, 0.15], [0.15, 0.4], [0.55, 0.02]], image: maImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.4, cy: 48.8, h: 43.0 }, labels: [] },
  み: { char: 'み', romaji: 'mi', word: 'みみ', vowel: 'い', strokes: 2, strokeStarts: [[0.2, 0.1], [0.8, 0.35]], image: miImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.5, cy: 49.3, h: 43.0 }, labels: [] },
  む: { char: 'む', romaji: 'mu', word: 'むしめがね', vowel: 'う', strokes: 3, strokeStarts: [[0.05, 0.25], [0.3, 0.02], [0.85, 0.25]], image: muImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.8, cy: 43.0, h: 43.0 }, labels: [] },
  め: { char: 'め', romaji: 'me', word: 'めがね', vowel: 'え', strokes: 2, strokeStarts: [[0.2, 0.2], [0.55, 0.02]], image: meImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.0, h: 43.0 }, labels: [] },
  も: { char: 'も', romaji: 'mo', word: 'もも', vowel: 'お', strokes: 3, strokeStarts: [[0.4, 0.02], [0.15, 0.35], [0.15, 0.6]], image: moImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.4, cy: 50.4, h: 43.0 }, labels: [] },
  や: { char: 'や', romaji: 'ya', word: 'やま', vowel: 'あ', strokes: 3, strokeStarts: [[0.1, 0.35], [0.55, 0.1], [0.3, 0.02]], image: yaImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 52.9, h: 43.0 }, labels: [] },
  ゆ: { char: 'ゆ', romaji: 'yu', word: 'ゆきだるま', vowel: 'う', strokes: 2, strokeStarts: [[0.1, 0.2], [0.6, 0.02]], image: yuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.1, cy: 60.0, h: 43.0 }, labels: [] },
  よ: { char: 'よ', romaji: 'yo', word: 'よつば', vowel: 'お', strokes: 2, strokeStarts: [[0.5, 0.25], [0.4, 0.02]], image: yoImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.8, cy: 46.9, h: 43.0 }, labels: [] },
  ら: { char: 'ら', romaji: 'ra', word: 'らいおん', vowel: 'あ', strokes: 2, strokeStarts: [[0.3, 0.02], [0.1, 0.3]], image: raImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 48.4, h: 43.0 }, labels: [] },
  り: { char: 'り', romaji: 'ri', word: 'りんご', vowel: 'い', strokes: 2, strokeStarts: [[0.15, 0.05], [0.75, 0.05]], image: riImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.2, cy: 60.0, h: 43.0 }, labels: [] },
  る: { char: 'る', romaji: 'ru', word: 'るびー', vowel: 'う', strokes: 1, strokeStarts: [[0.15, 0.1]], image: ruImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 49.3, h: 43.0 }, labels: [] },
  れ: { char: 'れ', romaji: 're', word: 'れもん', vowel: 'え', strokes: 2, strokeStarts: [[0.3, 0.02], [0.05, 0.3]], image: reImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.4, cy: 50.1, h: 43.0 }, labels: [] },
  ろ: { char: 'ろ', romaji: 'ro', word: 'ろぼっと', vowel: 'お', strokes: 1, strokeStarts: [[0.15, 0.1]], image: roImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.5, cy: 51.1, h: 43.0 }, labels: [] },
  わ: { char: 'わ', romaji: 'wa', word: 'わに', vowel: 'あ', strokes: 2, strokeStarts: [[0.3, 0.02], [0.05, 0.3]], image: waImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 47.6, h: 43.0 }, labels: [] },
  を: { char: 'を', romaji: 'wo', word: 'ほんをよむ', vowel: 'お', strokes: 3, strokeStarts: [[0.1, 0.15], [0.45, 0.02], [0.6, 0.45]], image: woImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.3, cy: 48.8, h: 43.0 }, labels: [{"text": "ほん", "cx": 28.7, "cy": 28.5, "h": 9.9}, {"text": "よむ", "cx": 71.0, "cy": 66.8, "h": 10.0}] },
  ん: { char: 'ん', romaji: 'n', word: 'きりん', vowel: 'う', strokes: 1, strokeStarts: [[0.55, 0.02]], image: nImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 57.8, cy: 49.7, h: 43.0 }, labels: [{"text": "きり", "cx": 44.3, "cy": 42.2, "h": 8.8}] },
  あ: {
    char: 'あ', vowel: 'あ', romaji: 'a', word: 'あり', strokes: 3,
    strokeStarts: [[0.27, 0.3], [0.44, 0.17], [0.62, 0.4]],
    image: aImg, imageAspect: 621 / 765,
    letter: { cx: 50.1, cy: 49.7, h: 44.4 },
  },
  い: {
    char: 'い', vowel: 'い', romaji: 'i', word: 'いちご', strokes: 2,
    strokeStarts: [[0.3, 0.26], [0.66, 0.34]],
    image: iImg, imageAspect: 621 / 768,
    letter: { cx: 49.4, cy: 55.4, h: 40.8 },
  },
  う: {
    char: 'う', vowel: 'う', romaji: 'u', word: 'うさぎ', strokes: 2,
    strokeStarts: [[0.4, 0.16], [0.3, 0.42]],
    image: uImg, imageAspect: 799 / 768,
    letter: { cx: 50.9, cy: 57.9, h: 54.2 },
  },
  え: {
    char: 'え', vowel: 'え', romaji: 'e', word: 'えんぴつ', strokes: 2,
    strokeStarts: [[0.41, 0.16], [0.28, 0.42]],
    image: eImg, imageAspect: 1239 / 507,
    letter: { cx: 50.4, cy: 49.4, h: 66.9 },
  },
  お: {
    char: 'お', vowel: 'お', romaji: 'o', word: 'おにぎり', strokes: 3,
    strokeStarts: [[0.24, 0.32], [0.44, 0.16], [0.68, 0.27]],
    image: oImg, imageAspect: 855 / 767,
    letter: { cx: 50.2, cy: 50, h: 48 }, // ほかのカードと同じ大きさ（のりに重なってよい）
  },
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
