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
 * ローマ字フローラちゃん おおもじ：アプリの中の「文字」は フローラちゃんと おなじ カタカナの キーで あつかい
 * （音声判定・きろく・声の ファイルを そのまま つかうため）、画面には ローマ字の 大文字（src/lib/romaji.ts）を だす。
 * カードの絵は カタカナはなちゃん／ひらがなデイジーちゃんと おなじ 線画（アイス・カメラ …）。
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
  word: string // 絵の名前（ひらがなで かく。ローマ字に する もと。わかちがきは スペース）
  kana: string // 絵の名前の ふつうの 書きかた（カードの 下に 小さく だす：アイス・パンを たべる）
  vowel: Vowel // 音読判定に使う母音
  /** 既定のカード絵（カタカナはなちゃんの 線画） */
  image: string
  imageAspect: number // 幅 / 高さ
  /** 絵の上に重ねる文字の位置（%）と大きさ（絵の高さに対する %） */
  letter: { cx: number; cy: number; h: number }
  /** 白い背景のカード（文字を消したカード） */
  framed?: boolean
  /** 絵の中の小さなことば（ひらがな。画面には ローマ字で だす）。いまの カードには ない */
  labels?: { text: string; cx: number; cy: number; h: number }[]
}

export const KANA_INFO: Record<Kana, KanaInfo> = {
  ア: { char: 'ア', hira: 'あ', romaji: 'a', word: 'あいす', kana: 'アイス', vowel: 'あ', image: aImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.1, cy: 52.0, h: 43.0 } },
  イ: { char: 'イ', hira: 'い', romaji: 'i', word: 'いんこ', kana: 'インコ', vowel: 'い', image: iImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.0, cy: 48.7, h: 43.0 } },
  ウ: { char: 'ウ', hira: 'う', romaji: 'u', word: 'うくれれ', kana: 'ウクレレ', vowel: 'う', image: uImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.6, cy: 50.4, h: 43.0 } },
  エ: { char: 'エ', hira: 'え', romaji: 'e', word: 'えぷろん', kana: 'エプロン', vowel: 'え', image: eImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 57.5, h: 43.0 } },
  オ: { char: 'オ', hira: 'お', romaji: 'o', word: 'おれんじ', kana: 'オレンジ', vowel: 'お', image: oImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.4, cy: 53.4, h: 43.0 } },
  カ: { char: 'カ', hira: 'か', romaji: 'ka', word: 'かめら', kana: 'カメラ', vowel: 'あ', image: kaImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.6, cy: 50.8, h: 43.0 } },
  キ: { char: 'キ', hira: 'き', romaji: 'ki', word: 'きゃべつ', kana: 'キャベツ', vowel: 'い', image: kiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.8, cy: 44.6, h: 43.0 } },
  ク: { char: 'ク', hira: 'く', romaji: 'ku', word: 'くれよん', kana: 'クレヨン', vowel: 'う', image: kuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.9, cy: 46.9, h: 43.0 } },
  ケ: { char: 'ケ', hira: 'け', romaji: 'ke', word: 'けーき', kana: 'ケーキ', vowel: 'え', image: keImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.8, cy: 50.2, h: 43.0 } },
  コ: { char: 'コ', hira: 'こ', romaji: 'ko', word: 'こあら', kana: 'コアラ', vowel: 'お', image: koImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.2, cy: 51.6, h: 43.0 } },
  サ: { char: 'サ', hira: 'さ', romaji: 'sa', word: 'さんどいっち', kana: 'サンドイッチ', vowel: 'あ', image: saImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.4, cy: 52.4, h: 43.0 } },
  シ: { char: 'シ', hira: 'し', romaji: 'shi', word: 'しーそー', kana: 'シーソー', vowel: 'い', image: shiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.3, cy: 48.8, h: 43.0 } },
  ス: { char: 'ス', hira: 'す', romaji: 'su', word: 'すぷーん', kana: 'スプーン', vowel: 'う', image: suImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.9, cy: 50.3, h: 43.0 } },
  セ: { char: 'セ', hira: 'せ', romaji: 'se', word: 'せーたー', kana: 'セーター', vowel: 'え', image: seImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.6, cy: 48.8, h: 43.0 } },
  ソ: { char: 'ソ', hira: 'そ', romaji: 'so', word: 'そーせーじ', kana: 'ソーセージ', vowel: 'お', image: soImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.8, cy: 52.6, h: 43.0 } },
  タ: { char: 'タ', hira: 'た', romaji: 'ta', word: 'たくしー', kana: 'タクシー', vowel: 'あ', image: taImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.4, cy: 48.8, h: 43.0 } },
  チ: { char: 'チ', hira: 'ち', romaji: 'chi', word: 'ちーず', kana: 'チーズ', vowel: 'い', image: chiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.9, cy: 49.1, h: 43.0 } },
  ツ: { char: 'ツ', hira: 'つ', romaji: 'tsu', word: 'つばめ', kana: 'ツバメ', vowel: 'う', image: tsuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.6, cy: 52.2, h: 43.0 } },
  テ: { char: 'テ', hira: 'て', romaji: 'te', word: 'てれび', kana: 'テレビ', vowel: 'え', image: teImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 54.6, h: 43.0 } },
  ト: { char: 'ト', hira: 'と', romaji: 'to', word: 'とまと', kana: 'トマト', vowel: 'お', image: toImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 53.1, cy: 51.2, h: 43.0 } },
  ナ: { char: 'ナ', hira: 'な', romaji: 'na', word: 'ないふ', kana: 'ナイフ', vowel: 'あ', image: naImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.8, cy: 47.0, h: 43.0 } },
  ニ: { char: 'ニ', hira: 'に', romaji: 'ni', word: 'にわとり', kana: 'ニワトリ', vowel: 'い', image: niImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 59.7, h: 43.0 } },
  ヌ: { char: 'ヌ', hira: 'ぬ', romaji: 'nu', word: 'ぬーどる', kana: 'ヌードル', vowel: 'う', image: nuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 46.8, cy: 52.3, h: 43.0 } },
  ネ: { char: 'ネ', hira: 'ね', romaji: 'ne', word: 'ねくたい', kana: 'ネクタイ', vowel: 'え', image: neImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.9, cy: 49.8, h: 43.0 } },
  ノ: { char: 'ノ', hira: 'の', romaji: 'no', word: 'のーと', kana: 'ノート', vowel: 'お', image: noImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 50.0, h: 43.0 } },
  ハ: { char: 'ハ', hira: 'は', romaji: 'ha', word: 'はんばーがー', kana: 'ハンバーガー', vowel: 'あ', image: haImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.9, cy: 50.5, h: 43.0 } },
  ヒ: { char: 'ヒ', hira: 'ひ', romaji: 'hi', word: 'ひまわり', kana: 'ヒマワリ', vowel: 'い', image: hiImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 51.0, cy: 51.3, h: 43.0 } },
  フ: { char: 'フ', hira: 'ふ', romaji: 'fu', word: 'ふらみんご', kana: 'フラミンゴ', vowel: 'う', image: fuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.6, cy: 50.0, h: 43.0 } },
  ヘ: { char: 'ヘ', hira: 'へ', romaji: 'he', word: 'へるめっと', kana: 'ヘルメット', vowel: 'え', image: heImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 55.1, cy: 43.1, h: 43.0 } },
  ホ: { char: 'ホ', hira: 'ほ', romaji: 'ho', word: 'ほっとけーき', kana: 'ホットケーキ', vowel: 'お', image: hoImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.3, cy: 49.6, h: 43.0 } },
  マ: { char: 'マ', hira: 'ま', romaji: 'ma', word: 'まふらー', kana: 'マフラー', vowel: 'あ', image: maImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.4, cy: 52.2, h: 43.0 } },
  ミ: { char: 'ミ', hira: 'み', romaji: 'mi', word: 'みるく', kana: 'ミルク', vowel: 'い', image: miImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.3, cy: 51.1, h: 43.0 } },
  ム: { char: 'ム', hira: 'む', romaji: 'mu', word: 'むささび', kana: 'ムササビ', vowel: 'う', image: muImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 47.9, h: 43.0 } },
  メ: { char: 'メ', hira: 'め', romaji: 'me', word: 'めがね', kana: 'メガネ', vowel: 'え', image: meImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.7, cy: 47.4, h: 43.0 } },
  モ: { char: 'モ', hira: 'も', romaji: 'mo', word: 'もんすたー', kana: 'モンスター', vowel: 'お', image: moImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 48.3, h: 43.0 } },
  ヤ: { char: 'ヤ', hira: 'や', romaji: 'ya', word: 'やぎ', kana: 'ヤギ', vowel: 'あ', image: yaImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 49.4, cy: 50.5, h: 43.0 } },
  ユ: { char: 'ユ', hira: 'ゆ', romaji: 'yu', word: 'ゆにこーん', kana: 'ユニコーン', vowel: 'う', image: yuImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.8, cy: 51.5, h: 43.0 } },
  ヨ: { char: 'ヨ', hira: 'よ', romaji: 'yo', word: 'よーぐると', kana: 'ヨーグルト', vowel: 'お', image: yoImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 47.3, cy: 50.9, h: 43.0 } },
  ラ: { char: 'ラ', hira: 'ら', romaji: 'ra', word: 'らんどせる', kana: 'ランドセル', vowel: 'あ', image: raImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.1, cy: 49.6, h: 43.0 } },
  リ: { char: 'リ', hira: 'り', romaji: 'ri', word: 'りぼん', kana: 'リボン', vowel: 'い', image: riImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.1, cy: 49.9, h: 43.0 } },
  ル: { char: 'ル', hira: 'る', romaji: 'ru', word: 'るーれっと', kana: 'ルーレット', vowel: 'う', image: ruImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.3, cy: 48.1, h: 43.0 } },
  レ: { char: 'レ', hira: 'れ', romaji: 're', word: 'れもん', kana: 'レモン', vowel: 'え', image: reImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 48.4, cy: 58.8, h: 43.0 } },
  ロ: { char: 'ロ', hira: 'ろ', romaji: 'ro', word: 'ろけっと', kana: 'ロケット', vowel: 'お', image: roImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 44.8, h: 43.0 } },
  ワ: { char: 'ワ', hira: 'わ', romaji: 'wa', word: 'わっふる', kana: 'ワッフル', vowel: 'あ', image: waImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.0, cy: 53.1, h: 43.0 } },
  ヲ: { char: 'ヲ', hira: 'を', romaji: 'wo', word: 'ぱん を たべる', kana: 'パンを たべる', vowel: 'お', image: woImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 43.9, cy: 47.8, h: 43.0 } },
  ン: { char: 'ン', hira: 'ん', romaji: 'n', word: 'ぷりん', kana: 'プリン', vowel: 'う', image: nImg, imageAspect: 1000 / 760, framed: true, letter: { cx: 50.8, cy: 48.4, h: 43.0 } },
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
