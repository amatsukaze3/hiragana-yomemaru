/**
 * 46もじ（あ〜ん）の よみの 表。5つの アプリ（よめ丸・はなちゃん・デイジーちゃん・フローラちゃん 小文字／おおもじ）の
 * 判定エンジンで つかう。アプリの 中の 文字の キーは ひらがな（よめ丸・デイジー）か カタカナ（はなちゃん・フローラちゃん）なので、
 * どちらで きても ひらがなに なおして この 表を ひく。
 */

export type Vowel = 'あ' | 'い' | 'う' | 'え' | 'お'
/** 子音の なかま（onset.ts の 学習モデルの クラス）。V：母音だけ */
export type OnsetClass = 'V' | 'K' | 'S' | 'H' | 'N' | 'Y' | 'W' | 'R'

export interface KanaSpec {
  hira: string
  /** ローマ字（ヘボン式：shi chi tsu fu、を は wo、ん は n） */
  romaji: string
  vowel: Vowel
  /** 子音の なかま（ん は null） */
  cls: OnsetClass | null
  /** 行（a・ka・sa … wa） */
  row: string
}

const ROWS: [string, string, OnsetClass][] = [
  ['a', 'あいうえお', 'V'],
  ['ka', 'かきくけこ', 'K'],
  ['sa', 'さしすせそ', 'S'],
  ['ta', 'たちつてと', 'K'],
  ['na', 'なにぬねの', 'N'],
  ['ha', 'はひふへほ', 'H'],
  ['ma', 'まみむめも', 'N'],
  ['ya', 'や_ゆ_よ', 'Y'],
  ['ra', 'らりるれろ', 'R'],
  ['wa', 'わ___を', 'W'],
]
const VOWELS: Vowel[] = ['あ', 'い', 'う', 'え', 'お']
const ROMA: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'wo', ん: 'n',
}

export const KANA46: Record<string, KanaSpec> = {}
for (const [row, chars, cls0] of ROWS) {
  ;[...chars].forEach((h, i) => {
    if (h === '_') return
    // を は お と おなじ よみ（母音だけ）。ち・つ は まさつの まじる 音（ts・ch）なので さ行と おなじ なかま
    const cls: OnsetClass = h === 'を' ? 'V' : h === 'ち' || h === 'つ' ? 'S' : cls0
    KANA46[h] = { hira: h, romaji: ROMA[h], vowel: VOWELS[i], cls, row }
  })
}
KANA46['ん'] = { hira: 'ん', romaji: 'n', vowel: 'う', cls: null, row: 'wa' }

/** カタカナ → ひらがな（ヴ・ヵ・ヶ も） */
export function toHiragana(s: string) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

/** アプリの 文字の キー（ひらがな・カタカナ）から よみの 表を ひく */
export function specOf(k: string | null | undefined): KanaSpec | null {
  if (!k) return null
  return KANA46[toHiragana(k)] ?? null
}

export const VOWEL_KANA = VOWELS

/** 子音の ある 文字か（か行〜わ。あ行・を・ん は ちがう） */
export function hasConsonant(k: string | null | undefined) {
  const sp = specOf(k)
  return !!sp && !!sp.cls && sp.cls !== 'V'
}
