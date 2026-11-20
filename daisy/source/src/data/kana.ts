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
  name: string // あ行
  kana: Kana[]
}

export const ROWS: Row[] = [
  { id: 'a', name: 'あ row', kana: ['あ', 'い', 'う', 'え', 'お'] },
  { id: 'ka', name: 'か row', kana: ['か', 'き', 'く', 'け', 'こ'] },
  { id: 'sa', name: 'さ row', kana: ['さ', 'し', 'す', 'せ', 'そ'] },
  { id: 'ta', name: 'た row', kana: ['た', 'ち', 'つ', 'て', 'と'] },
  { id: 'na', name: 'な row', kana: ['な', 'に', 'ぬ', 'ね', 'の'] },
  { id: 'ha', name: 'は row', kana: ['は', 'ひ', 'ふ', 'へ', 'ほ'] },
  { id: 'ma', name: 'ま row', kana: ['ま', 'み', 'む', 'め', 'も'] },
  { id: 'ya', name: 'や row', kana: ['や', 'ゆ', 'よ'] },
  { id: 'ra', name: 'ら row', kana: ['ら', 'り', 'る', 'れ', 'ろ'] },
  { id: 'wa', name: 'わ row', kana: ['わ', 'を', 'ん'] },
]

export const KANA: Kana[] = ROWS.flatMap((r) => r.kana)

export interface KanaInfo {
  char: Kana
  romaji: string
  word: string // 絵の名前（ひらがな）
  /** 絵の英語（英語圏の子むけ） */
  en: string
  /** 絵の名前の よみ（カタカナ。VOICEVOX の こえの もと） */
  say: string
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
  あ: { char: 'あ', romaji: 'a', word: 'あいす', en: 'ice cream', say: 'アイス', vowel: 'あ', strokes: 3, strokeStarts: [[0.05, 0.15], [0.4, 0.02], [0.72, 0.3]], image: aImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.1, cy: 52.0, h: 43.0 } },
  い: { char: 'い', romaji: 'i', word: 'いんこ', en: 'parakeet', say: 'インコ', vowel: 'い', strokes: 2, strokeStarts: [[0.08, 0.05], [0.78, 0.12]], image: iImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.0, cy: 48.7, h: 43.0 } },
  う: { char: 'う', romaji: 'u', word: 'うくれれ', en: 'ukulele', say: 'ウクレレ', vowel: 'う', strokes: 2, strokeStarts: [[0.25, 0.04], [0.06, 0.36]], image: uImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.6, cy: 50.4, h: 43.0 } },
  え: { char: 'え', romaji: 'e', word: 'えぷろん', en: 'apron', say: 'エプロン', vowel: 'え', strokes: 2, strokeStarts: [[0.25, 0.03], [0.1, 0.38]], image: eImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 57.5, h: 43.0 } },
  お: { char: 'お', romaji: 'o', word: 'おれんじ', en: 'orange', say: 'オレンジ', vowel: 'お', strokes: 3, strokeStarts: [[0.03, 0.22], [0.32, 0.02], [0.8, 0.17]], image: oImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.4, cy: 53.4, h: 43.0 } },
  か: { char: 'か', romaji: 'ka', word: 'かめら', en: 'camera', say: 'カメラ', vowel: 'あ', strokes: 3, strokeStarts: [[0.1, 0.3], [0.38, 0.05], [0.8, 0.28]], image: kaImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.6, cy: 50.8, h: 43.0 } },
  き: { char: 'き', romaji: 'ki', word: 'きゃべつ', en: 'cabbage', say: 'キャベツ', vowel: 'い', strokes: 4, strokeStarts: [[0.2, 0.2], [0.15, 0.42], [0.4, 0.02], [0.25, 0.75]], image: kiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.8, cy: 44.6, h: 43.0 } },
  く: { char: 'く', romaji: 'ku', word: 'くれよん', en: 'crayon', say: 'クレヨン', vowel: 'う', strokes: 1, strokeStarts: [[0.75, 0.02]], image: kuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.9, cy: 46.9, h: 43.0 } },
  け: { char: 'け', romaji: 'ke', word: 'けーき', en: 'cake', say: 'ケーキ', vowel: 'え', strokes: 3, strokeStarts: [[0.12, 0.1], [0.45, 0.35], [0.75, 0.05]], image: keImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.8, cy: 50.2, h: 43.0 } },
  こ: { char: 'こ', romaji: 'ko', word: 'こあら', en: 'koala', say: 'コアラ', vowel: 'お', strokes: 2, strokeStarts: [[0.2, 0.1], [0.1, 0.65]], image: koImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.2, cy: 51.6, h: 43.0 } },
  さ: { char: 'さ', romaji: 'sa', word: 'さんどいっち', en: 'sandwich', say: 'サンドイッチ', vowel: 'あ', strokes: 3, strokeStarts: [[0.15, 0.25], [0.45, 0.02], [0.25, 0.7]], image: saImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.4, cy: 52.4, h: 43.0 } },
  し: { char: 'し', romaji: 'shi', word: 'しーそー', en: 'seesaw', say: 'シーソー', vowel: 'い', strokes: 1, strokeStarts: [[0.3, 0.02]], image: shiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.3, cy: 48.8, h: 43.0 } },
  す: { char: 'す', romaji: 'su', word: 'すぷーん', en: 'spoon', say: 'スプーン', vowel: 'う', strokes: 2, strokeStarts: [[0.05, 0.25], [0.55, 0.02]], image: suImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.9, cy: 50.3, h: 43.0 } },
  せ: { char: 'せ', romaji: 'se', word: 'せーたー', en: 'sweater', say: 'セーター', vowel: 'え', strokes: 3, strokeStarts: [[0.05, 0.4], [0.7, 0.05], [0.3, 0.05]], image: seImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.6, cy: 48.8, h: 43.0 } },
  そ: { char: 'そ', romaji: 'so', word: 'そーせーじ', en: 'sausage', say: 'ソーセージ', vowel: 'お', strokes: 1, strokeStarts: [[0.25, 0.05]], image: soImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.8, cy: 52.6, h: 43.0 } },
  た: { char: 'た', romaji: 'ta', word: 'たくしー', en: 'taxi', say: 'タクシー', vowel: 'あ', strokes: 4, strokeStarts: [[0.1, 0.25], [0.35, 0.02], [0.6, 0.45], [0.55, 0.8]], image: taImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.4, cy: 48.8, h: 43.0 } },
  ち: { char: 'ち', romaji: 'chi', word: 'ちーず', en: 'cheese', say: 'チーズ', vowel: 'い', strokes: 2, strokeStarts: [[0.1, 0.25], [0.4, 0.02]], image: chiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.9, cy: 49.1, h: 43.0 } },
  つ: { char: 'つ', romaji: 'tsu', word: 'つばめ', en: 'swallow (bird)', say: 'ツバメ', vowel: 'う', strokes: 1, strokeStarts: [[0.05, 0.35]], image: tsuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.6, cy: 52.2, h: 43.0 } },
  て: { char: 'て', romaji: 'te', word: 'てれび', en: 'TV', say: 'テレビ', vowel: 'え', strokes: 1, strokeStarts: [[0.05, 0.15]], image: teImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 54.6, h: 43.0 } },
  と: { char: 'と', romaji: 'to', word: 'とまと', en: 'tomato', say: 'トマト', vowel: 'お', strokes: 2, strokeStarts: [[0.3, 0.05], [0.75, 0.3]], image: toImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 53.1, cy: 51.2, h: 43.0 } },
  な: { char: 'な', romaji: 'na', word: 'ないふ', en: 'knife', say: 'ナイフ', vowel: 'あ', strokes: 4, strokeStarts: [[0.1, 0.25], [0.35, 0.02], [0.8, 0.3], [0.6, 0.4]], image: naImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.8, cy: 47.0, h: 43.0 } },
  に: { char: 'に', romaji: 'ni', word: 'にわとり', en: 'chicken', say: 'ニワトリ', vowel: 'い', strokes: 3, strokeStarts: [[0.15, 0.05], [0.5, 0.25], [0.45, 0.7]], image: niImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 59.7, h: 43.0 } },
  ぬ: { char: 'ぬ', romaji: 'nu', word: 'ぬーどる', en: 'noodles', say: 'ヌードル', vowel: 'う', strokes: 2, strokeStarts: [[0.15, 0.25], [0.5, 0.05]], image: nuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.8, cy: 52.3, h: 43.0 } },
  ね: { char: 'ね', romaji: 'ne', word: 'ねくたい', en: 'necktie', say: 'ネクタイ', vowel: 'え', strokes: 2, strokeStarts: [[0.3, 0.02], [0.05, 0.3]], image: neImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.9, cy: 49.8, h: 43.0 } },
  の: { char: 'の', romaji: 'no', word: 'のーと', en: 'notebook', say: 'ノート', vowel: 'お', strokes: 1, strokeStarts: [[0.5, 0.2]], image: noImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.0, h: 43.0 } },
  は: { char: 'は', romaji: 'ha', word: 'はんばーがー', en: 'hamburger', say: 'ハンバーガー', vowel: 'あ', strokes: 3, strokeStarts: [[0.15, 0.05], [0.45, 0.3], [0.7, 0.05]], image: haImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.9, cy: 50.5, h: 43.0 } },
  ひ: { char: 'ひ', romaji: 'hi', word: 'ひまわり', en: 'sunflower', say: 'ヒマワリ', vowel: 'い', strokes: 1, strokeStarts: [[0.05, 0.15]], image: hiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 51.0, cy: 51.3, h: 43.0 } },
  ふ: { char: 'ふ', romaji: 'fu', word: 'ふらみんご', en: 'flamingo', say: 'フラミンゴ', vowel: 'う', strokes: 4, strokeStarts: [[0.45, 0.05], [0.4, 0.35], [0.05, 0.75], [0.85, 0.6]], image: fuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.6, cy: 50.0, h: 43.0 } },
  へ: { char: 'へ', romaji: 'he', word: 'へるめっと', en: 'helmet', say: 'ヘルメット', vowel: 'え', strokes: 1, strokeStarts: [[0.05, 0.6]], image: heImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 55.1, cy: 43.1, h: 43.0 } },
  ほ: { char: 'ほ', romaji: 'ho', word: 'ほっとけーき', en: 'pancakes', say: 'ホットケーキ', vowel: 'お', strokes: 4, strokeStarts: [[0.12, 0.05], [0.45, 0.1], [0.45, 0.4], [0.7, 0.1]], image: hoImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.3, cy: 49.6, h: 43.0 } },
  ま: { char: 'ま', romaji: 'ma', word: 'まふらー', en: 'scarf', say: 'マフラー', vowel: 'あ', strokes: 3, strokeStarts: [[0.15, 0.15], [0.15, 0.4], [0.55, 0.02]], image: maImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.4, cy: 52.2, h: 43.0 } },
  み: { char: 'み', romaji: 'mi', word: 'みるく', en: 'milk', say: 'ミルク', vowel: 'い', strokes: 2, strokeStarts: [[0.2, 0.1], [0.8, 0.35]], image: miImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.3, cy: 51.1, h: 43.0 } },
  む: { char: 'む', romaji: 'mu', word: 'むささび', en: 'flying squirrel', say: 'ムササビ', vowel: 'う', strokes: 3, strokeStarts: [[0.05, 0.25], [0.3, 0.02], [0.85, 0.25]], image: muImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 47.9, h: 43.0 } },
  め: { char: 'め', romaji: 'me', word: 'めがね', en: 'glasses', say: 'メガネ', vowel: 'え', strokes: 2, strokeStarts: [[0.2, 0.2], [0.55, 0.02]], image: meImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.7, cy: 47.4, h: 43.0 } },
  も: { char: 'も', romaji: 'mo', word: 'もんすたー', en: 'monster', say: 'モンスター', vowel: 'お', strokes: 3, strokeStarts: [[0.4, 0.02], [0.15, 0.35], [0.15, 0.6]], image: moImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 48.3, h: 43.0 } },
  や: { char: 'や', romaji: 'ya', word: 'やぎ', en: 'goat', say: 'ヤギ', vowel: 'あ', strokes: 3, strokeStarts: [[0.1, 0.35], [0.55, 0.1], [0.3, 0.02]], image: yaImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.4, cy: 50.5, h: 43.0 } },
  ゆ: { char: 'ゆ', romaji: 'yu', word: 'ゆにこーん', en: 'unicorn', say: 'ユニコーン', vowel: 'う', strokes: 2, strokeStarts: [[0.1, 0.2], [0.6, 0.02]], image: yuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.8, cy: 51.5, h: 43.0 } },
  よ: { char: 'よ', romaji: 'yo', word: 'よーぐると', en: 'yogurt', say: 'ヨーグルト', vowel: 'お', strokes: 2, strokeStarts: [[0.5, 0.25], [0.4, 0.02]], image: yoImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 47.3, cy: 50.9, h: 43.0 } },
  ら: { char: 'ら', romaji: 'ra', word: 'らんどせる', en: 'school backpack', say: 'ランドセル', vowel: 'あ', strokes: 2, strokeStarts: [[0.3, 0.02], [0.1, 0.3]], image: raImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.1, cy: 49.6, h: 43.0 } },
  り: { char: 'り', romaji: 'ri', word: 'りぼん', en: 'ribbon', say: 'リボン', vowel: 'い', strokes: 2, strokeStarts: [[0.15, 0.05], [0.75, 0.05]], image: riImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.1, cy: 49.9, h: 43.0 } },
  る: { char: 'る', romaji: 'ru', word: 'るーれっと', en: 'roulette', say: 'ルーレット', vowel: 'う', strokes: 1, strokeStarts: [[0.15, 0.1]], image: ruImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.3, cy: 48.1, h: 43.0 } },
  れ: { char: 'れ', romaji: 're', word: 'れもん', en: 'lemon', say: 'レモン', vowel: 'え', strokes: 2, strokeStarts: [[0.3, 0.02], [0.05, 0.3]], image: reImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.4, cy: 58.8, h: 43.0 } },
  ろ: { char: 'ろ', romaji: 'ro', word: 'ろけっと', en: 'rocket', say: 'ロケット', vowel: 'お', strokes: 1, strokeStarts: [[0.15, 0.1]], image: roImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 44.8, h: 43.0 } },
  わ: { char: 'わ', romaji: 'wa', word: 'わっふる', en: 'waffle', say: 'ワッフル', vowel: 'あ', strokes: 2, strokeStarts: [[0.3, 0.02], [0.05, 0.3]], image: waImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 53.1, h: 43.0 } },
  を: { char: 'を', romaji: 'wo', word: 'ぱんをたべる', en: 'eat bread', say: 'パンヲタベル', vowel: 'お', strokes: 3, strokeStarts: [[0.1, 0.15], [0.45, 0.02], [0.6, 0.45]], image: woImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 43.9, cy: 47.8, h: 43.0 } },
  ん: { char: 'ん', romaji: 'n', word: 'ぷりん', en: 'pudding', say: 'プリン', vowel: 'う', strokes: 1, strokeStarts: [[0.55, 0.02]], image: nImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.8, cy: 48.4, h: 43.0 } },
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
