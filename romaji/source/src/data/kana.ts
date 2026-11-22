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

/**
 * ローマ字フローラちゃん：アプリの中の「文字」は フローラちゃんと おなじ カタカナの キーで あつかい
 * （音声判定・きろく・声の ファイルを そのまま つかうため）、画面には ローマ字（src/lib/romaji.ts）を だす。
 */
export interface Row {
  id: string
  name: string // か行
  kana: Kana[]
}

export const ROWS: Row[] = [
  { id: 'a', name: 'あ行', kana: ['ア', 'イ', 'ウ', 'エ', 'オ'] },
  { id: 'ka', name: 'か行', kana: ['カ', 'キ', 'ク', 'ケ', 'コ'] },
  { id: 'sa', name: 'さ行', kana: ['サ', 'シ', 'ス', 'セ', 'ソ'] },
  { id: 'ta', name: 'た行', kana: ['タ', 'チ', 'ツ', 'テ', 'ト'] },
  { id: 'na', name: 'な行', kana: ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'] },
  { id: 'ha', name: 'は行', kana: ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'] },
  { id: 'ma', name: 'ま行', kana: ['マ', 'ミ', 'ム', 'メ', 'モ'] },
  { id: 'ya', name: 'や行', kana: ['ヤ', 'ユ', 'ヨ'] },
  { id: 'ra', name: 'ら行', kana: ['ラ', 'リ', 'ル', 'レ', 'ロ'] },
  { id: 'wa', name: 'わ行', kana: ['ワ', 'ヲ', 'ン'] },
]

export const KANA: Kana[] = ROWS.flatMap((r) => r.kana)

export interface KanaInfo {
  char: Kana // 内部キー（カタカナ）
  hira: string // ひらがな（こたえ に だす）
  romaji: string // あたらしい ローマ字（令和7年 内閣告示）。訓令式は romaji.ts で かえる
  word: string // 絵の名前（ひらがな。ローマ字は ことばごとに あけるので、わかちがきは スペース）
  vowel: Vowel // 音読判定に使う母音
  /** 既定のカード絵（ひらがなよめ丸の 線画） */
  image: string
  imageAspect: number // 幅 / 高さ
  /** 絵の上に重ねる文字の位置（%）と大きさ（絵の高さに対する %） */
  letter: { cx: number; cy: number; h: number }
  /** 白い背景のカード（文字を消したカード） */
  framed?: boolean
  /** 絵の中の小さなことば（ひらがな。画面には ローマ字で だす） */
  labels?: { text: string; cx: number; cy: number; h: number }[]
}

export const KANA_INFO: Record<Kana, KanaInfo> = {
  ア: { char: 'ア', hira: 'あ', romaji: 'a', word: 'あり', vowel: 'あ', image: aImg, imageAspect: 621 / 765, letter: { cx: 50.1, cy: 49.7, h: 44.4 } },
  イ: { char: 'イ', hira: 'い', romaji: 'i', word: 'いちご', vowel: 'い', image: iImg, imageAspect: 621 / 768, letter: { cx: 49.4, cy: 55.4, h: 40.8 } },
  ウ: { char: 'ウ', hira: 'う', romaji: 'u', word: 'うさぎ', vowel: 'う', image: uImg, imageAspect: 799 / 768, letter: { cx: 50.9, cy: 57.9, h: 54.2 } },
  エ: { char: 'エ', hira: 'え', romaji: 'e', word: 'えんぴつ', vowel: 'え', image: eImg, imageAspect: 1239 / 507, letter: { cx: 50.4, cy: 49.4, h: 66.9 } },
  オ: { char: 'オ', hira: 'お', romaji: 'o', word: 'おにぎり', vowel: 'お', image: oImg, imageAspect: 855 / 767, letter: { cx: 50.2, cy: 50, h: 48 } },
  カ: { char: 'カ', hira: 'か', romaji: 'ka', word: 'かめ', vowel: 'あ', image: kaImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.2, cy: 43.2, h: 43.0 } },
  キ: { char: 'キ', hira: 'き', romaji: 'ki', word: 'きつね', vowel: 'い', image: kiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.9, cy: 44.7, h: 43.0 } },
  ク: { char: 'ク', hira: 'く', romaji: 'ku', word: 'くるま', vowel: 'う', image: kuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.5, cy: 46.0, h: 43.0 } },
  ケ: { char: 'ケ', hira: 'け', romaji: 'ke', word: 'けしごむ', vowel: 'え', image: keImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.6, cy: 50.5, h: 43.0 } },
  コ: { char: 'コ', hira: 'こ', romaji: 'ko', word: 'こおり', vowel: 'お', image: koImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.6, h: 43.0 } },
  サ: { char: 'サ', hira: 'さ', romaji: 'sa', word: 'さかな', vowel: 'あ', image: saImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.2, cy: 50.1, h: 43.0 } },
  シ: { char: 'シ', hira: 'し', romaji: 'shi', word: 'しんかんせん', vowel: 'い', image: shiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 52.6, cy: 49.9, h: 43.0 } },
  ス: { char: 'ス', hira: 'す', romaji: 'su', word: 'すいか', vowel: 'う', image: suImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.5, cy: 43.3, h: 43.0 } },
  セ: { char: 'セ', hira: 'せ', romaji: 'se', word: 'せみ', vowel: 'え', image: seImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 46.7, h: 43.0 } },
  ソ: { char: 'ソ', hira: 'そ', romaji: 'so', word: 'そうじき', vowel: 'お', image: soImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 47.6, cy: 50.3, h: 43.0 } },
  タ: { char: 'タ', hira: 'た', romaji: 'ta', word: 'たいよう', vowel: 'あ', image: taImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.5, cy: 49.3, h: 43.0 } },
  チ: { char: 'チ', hira: 'ち', romaji: 'chi', word: 'ちょうちょ', vowel: 'い', image: chiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.5, cy: 49.1, h: 43.0 } },
  ツ: { char: 'ツ', hira: 'つ', romaji: 'tsu', word: 'つき', vowel: 'う', image: tsuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.6, cy: 49.1, h: 43.0 } },
  テ: { char: 'テ', hira: 'て', romaji: 'te', word: 'てんとうむし', vowel: 'え', image: teImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.6, cy: 54.1, h: 43.0 } },
  ト: { char: 'ト', hira: 'と', romaji: 'to', word: 'とら', vowel: 'お', image: toImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.2, cy: 49.6, h: 43.0 } },
  ナ: { char: 'ナ', hira: 'な', romaji: 'na', word: 'なす', vowel: 'あ', image: naImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.8, cy: 50.0, h: 43.0 } },
  ニ: { char: 'ニ', hira: 'に', romaji: 'ni', word: 'にんじん', vowel: 'い', image: niImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.8, cy: 55.2, h: 43.0 } },
  ヌ: { char: 'ヌ', hira: 'ぬ', romaji: 'nu', word: 'ぬいぐるみ', vowel: 'う', image: nuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.4, cy: 48.9, h: 43.0 } },
  ネ: { char: 'ネ', hira: 'ね', romaji: 'ne', word: 'ねこ', vowel: 'え', image: neImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.7, cy: 48.7, h: 43.0 } },
  ノ: { char: 'ノ', hira: 'の', romaji: 'no', word: 'のり', vowel: 'お', image: noImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 40.1, cy: 49.8, h: 43.0 } },
  ハ: { char: 'ハ', hira: 'は', romaji: 'ha', word: 'はさみ', vowel: 'あ', image: haImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.2, cy: 49.1, h: 43.0 } },
  ヒ: { char: 'ヒ', hira: 'ひ', romaji: 'hi', word: 'ひこうき', vowel: 'い', image: hiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.9, h: 43.0 } },
  フ: { char: 'フ', hira: 'ふ', romaji: 'fu', word: 'ふうせん', vowel: 'う', image: fuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.1, h: 43.0 } },
  ヘ: { char: 'ヘ', hira: 'へ', romaji: 'he', word: 'へりこぷたー', vowel: 'え', image: heImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.5, h: 43.0 } },
  ホ: { char: 'ホ', hira: 'ほ', romaji: 'ho', word: 'ほし', vowel: 'お', image: hoImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.2, h: 43.0 } },
  マ: { char: 'マ', hira: 'ま', romaji: 'ma', word: 'まくら', vowel: 'あ', image: maImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.4, cy: 48.8, h: 43.0 } },
  ミ: { char: 'ミ', hira: 'み', romaji: 'mi', word: 'みみ', vowel: 'い', image: miImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.5, cy: 49.3, h: 43.0 } },
  ム: { char: 'ム', hira: 'む', romaji: 'mu', word: 'むしめがね', vowel: 'う', image: muImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.8, cy: 43.0, h: 43.0 } },
  メ: { char: 'メ', hira: 'め', romaji: 'me', word: 'めがね', vowel: 'え', image: meImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.0, h: 43.0 } },
  モ: { char: 'モ', hira: 'も', romaji: 'mo', word: 'もも', vowel: 'お', image: moImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.4, cy: 50.4, h: 43.0 } },
  ヤ: { char: 'ヤ', hira: 'や', romaji: 'ya', word: 'やま', vowel: 'あ', image: yaImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 52.9, h: 43.0 } },
  ユ: { char: 'ユ', hira: 'ゆ', romaji: 'yu', word: 'ゆきだるま', vowel: 'う', image: yuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.1, cy: 60.0, h: 43.0 } },
  ヨ: { char: 'ヨ', hira: 'よ', romaji: 'yo', word: 'よつば', vowel: 'お', image: yoImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.8, cy: 46.9, h: 43.0 } },
  ラ: { char: 'ラ', hira: 'ら', romaji: 'ra', word: 'らいおん', vowel: 'あ', image: raImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 48.4, h: 43.0 } },
  リ: { char: 'リ', hira: 'り', romaji: 'ri', word: 'りんご', vowel: 'い', image: riImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.2, cy: 60.0, h: 43.0 } },
  ル: { char: 'ル', hira: 'る', romaji: 'ru', word: 'るびー', vowel: 'う', image: ruImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 49.3, h: 43.0 } },
  レ: { char: 'レ', hira: 'れ', romaji: 're', word: 'れもん', vowel: 'え', image: reImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.4, cy: 50.1, h: 43.0 } },
  ロ: { char: 'ロ', hira: 'ろ', romaji: 'ro', word: 'ろぼっと', vowel: 'お', image: roImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.5, cy: 51.1, h: 43.0 } },
  ワ: { char: 'ワ', hira: 'わ', romaji: 'wa', word: 'わに', vowel: 'あ', image: waImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 47.6, h: 43.0 } },
  ヲ: { char: 'ヲ', hira: 'を', romaji: 'wo', word: 'ほん を よむ', vowel: 'お', image: woImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.3, cy: 48.8, h: 43.0 }, labels: [{ text: 'ほん', cx: 28.7, cy: 28.5, h: 9.9 }, { text: 'よむ', cx: 71.0, cy: 66.8, h: 10.0 }] },
  ン: { char: 'ン', hira: 'ん', romaji: 'n', word: 'きりん', vowel: 'う', image: nImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 57.8, cy: 49.7, h: 43.0 }, labels: [{ text: 'きり', cx: 44.3, cy: 42.2, h: 8.8 }] },
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
