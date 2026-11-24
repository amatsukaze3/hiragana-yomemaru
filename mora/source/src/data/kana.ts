/**
 * ひらがなよめ丸 スペシャルモーラ：特殊音（濁音・半濁音・拗音・長音・撥音・拗長音・促音）のカード
 *
 * 1つのカード＝1つの「よみ」（Kana は その よみの 文字列：「が」「きゃ」「おかあさん」）
 *  - 濁音・半濁音・拗音：1つの 音を よむ（絵カードの ことばは word）
 *  - 長音・撥音・拗長音・促音：ことばを まるごと よむ（multi）
 * カードの絵は できたものから入れる（image が '' の あいだは 文字と ことばだけの カード。濁音・半濁音・拗音・撥音・長音・拗長音・促音は 2026-11-23 に 入れた。はっぱ は 絵なし）
 */

export type Kana = string
export type Vowel = 'あ' | 'い' | 'う' | 'え' | 'お'

export type Group = 'daku' | 'handaku' | 'you' | 'chou' | 'hatsu' | 'youchou' | 'soku'

export interface Row {
  id: string
  name: string // 先生向けの なまえ（が行・長音 など）
  label: string // ボタンに 出す 短い もじ
  group: Group
  kana: Kana[]
}

export const GROUPS: { id: Group; name: string; sub: string }[] = [
  { id: 'daku', name: '濁音', sub: 'が・ざ・だ・ば' },
  { id: 'handaku', name: '半濁音', sub: 'ぱ' },
  { id: 'you', name: '拗音', sub: 'きゃ・しゃ…' },
  { id: 'chou', name: '長音', sub: 'のばす おと' },
  { id: 'hatsu', name: '撥音', sub: 'ん' },
  { id: 'youchou', name: '拗長音', sub: 'きゅう…' },
  { id: 'soku', name: '促音', sub: 'っ' },
]

/** [よみ, ローマ字（音声ファイル名）, 絵カードの ことば] */
type Item = [Kana, string, string]

const SOUND_ROWS: { id: string; name: string; label: string; group: Group; items: Item[] }[] = [
  { id: 'ga', name: 'が行', label: 'が', group: 'daku', items: [['が', 'ga', 'めがね'], ['ぎ', 'gi', 'うさぎ'], ['ぐ', 'gu', 'ぐみ'], ['げ', 'ge', 'げた'], ['ご', 'go', 'ごはん']] },
  { id: 'za', name: 'ざ行', label: 'ざ', group: 'daku', items: [['ざ', 'za', 'ざる'], ['じ', 'ji', 'にじ'], ['ず', 'zu', 'みず'], ['ぜ', 'ze', 'かぜ'], ['ぞ', 'zo', 'ぞう']] },
  { id: 'da', name: 'だ行', label: 'だ', group: 'daku', items: [['だ', 'da', 'だいこん'], ['ぢ', 'di', 'はなぢ'], ['づ', 'du', 'みかづき'], ['で', 'de', 'でんわ'], ['ど', 'do', 'どんぐり']] },
  { id: 'ba', name: 'ば行', label: 'ば', group: 'daku', items: [['ば', 'ba', 'ばなな'], ['び', 'bi', 'えび'], ['ぶ', 'bu', 'ぶた'], ['べ', 'be', 'べんとう'], ['ぼ', 'bo', 'ぼたん']] },
  { id: 'pa', name: 'ぱ行', label: 'ぱ', group: 'handaku', items: [['ぱ', 'pa', 'ぱんだ'], ['ぴ', 'pi', 'えんぴつ'], ['ぷ', 'pu', 'てんぷら'], ['ぺ', 'pe', 'ぺんぎん'], ['ぽ', 'po', 'たんぽぽ']] },
  { id: 'kya', name: 'きゃ行', label: 'きゃ', group: 'you', items: [['きゃ', 'kya', 'きゃべつ'], ['きゅ', 'kyu', 'きゅうり'], ['きょ', 'kyo', 'きょじん']] },
  { id: 'sha', name: 'しゃ行', label: 'しゃ', group: 'you', items: [['しゃ', 'sha', 'しゃしん'], ['しゅ', 'shu', 'しゅりけん'], ['しょ', 'sho', 'しょくぱん']] },
  { id: 'cha', name: 'ちゃ行', label: 'ちゃ', group: 'you', items: [['ちゃ', 'cha', 'ちゃわん'], ['ちゅ', 'chu', 'ちゅうりっぷ'], ['ちょ', 'cho', 'ちょきんばこ']] },
  { id: 'nya', name: 'にゃ行', label: 'にゃ', group: 'you', items: [['にゃ', 'nya', 'こんにゃく'], ['にゅ', 'nyu', 'ぎゅうにゅう'], ['にょ', 'nyo', 'にょろにょろ']] },
  { id: 'hya', name: 'ひゃ行', label: 'ひゃ', group: 'you', items: [['ひゃ', 'hya', 'ひゃく'], ['ひゅ', 'hyu', 'ひゅうひゅう'], ['ひょ', 'hyo', 'ひょう']] },
  { id: 'mya', name: 'みゃ行', label: 'みゃ', group: 'you', items: [['みゃ', 'mya', 'さんみゃく'], ['みゅ', 'myu', ''], ['みょ', 'myo', 'みょうが']] },
  { id: 'rya', name: 'りゃ行', label: 'りゃ', group: 'you', items: [['りゃ', 'rya', ''], ['りゅ', 'ryu', 'りゅう'], ['りょ', 'ryo', 'りょかん']] },
  { id: 'gya', name: 'ぎゃ行', label: 'ぎゃ', group: 'you', items: [['ぎゃ', 'gya', 'ぎゃおー'], ['ぎゅ', 'gyu', 'ぎゅうにゅう'], ['ぎょ', 'gyo', 'きんぎょ']] },
  { id: 'ja', name: 'じゃ行', label: 'じゃ', group: 'you', items: [['じゃ', 'ja', 'じゃんけん'], ['じゅ', 'ju', 'しんじゅ'], ['じょ', 'jo', 'じょうろ']] },
  { id: 'bya', name: 'びゃ行', label: 'びゃ', group: 'you', items: [['びゃ', 'bya', 'さんびゃく'], ['びゅ', 'byu', ''], ['びょ', 'byo', 'びょういん']] },
  { id: 'pya', name: 'ぴゃ行', label: 'ぴゃ', group: 'you', items: [['ぴゃ', 'pya', 'はっぴゃく'], ['ぴゅ', 'pyu', 'ぴゅうぴゅう'], ['ぴょ', 'pyo', 'ぴょんぴょん']] },
]

/** ことばで よむ カード：[ことば, ローマ字] */
const WORD_ROWS: { id: string; name: string; label: string; group: Group; items: [string, string][] }[] = [
  {
    id: 'chou', name: '長音（のばすおと）', label: 'ー', group: 'chou',
    items: [['おかあさん', 'okaasan'], ['おにいさん', 'oniisan'], ['ふうせん', 'fuusen'], ['おねえさん', 'oneesan'], ['こおり', 'koori'], ['おとうさん', 'otousan'], ['ぼうし', 'boushi'], ['とけい', 'tokei'], ['せんせい', 'sensei']],
  },
  {
    id: 'hatsu', name: '撥音（ん）', label: 'ん', group: 'hatsu',
    items: [['みかん', 'mikan'], ['りんご', 'ringo'], ['ほん', 'hon'], ['きりん', 'kirin'], ['かばん', 'kaban'], ['てんとうむし', 'tentoumushi'], ['えんぴつ', 'enpitsu'], ['ぱんだ', 'panda_w']],
  },
  {
    id: 'youchou', name: '拗長音', label: 'きゅう', group: 'youchou',
    items: [['きゅうり', 'kyuuri'], ['ぎゅうにゅう', 'gyuunyuu'], ['きょうりゅう', 'kyouryuu'], ['ちょうちょ', 'choucho'], ['しょうぼうしゃ', 'shoubousha'], ['じょうろ', 'jouro'], ['びょういん', 'byouin'], ['ちゅうしゃ', 'chuusha'], ['りゅう', 'ryuu'], ['ひょう', 'hyou']],
  },
  {
    id: 'soku', name: '促音（っ）', label: 'っ', group: 'soku',
    items: [['きって', 'kitte'], ['らっぱ', 'rappa'], ['こっぷ', 'koppu'], ['ねっこ', 'nekko'], ['しっぽ', 'shippo'], ['いっぱい', 'ippai'], ['がっこう', 'gakkou'], ['はっぱ', 'happa'], ['しっぱい', 'shippai'], ['らっこ', 'rakko']],
  },
]

export const ROWS: Row[] = [
  ...SOUND_ROWS.map((r) => ({ id: r.id, name: r.name, label: r.label, group: r.group, kana: r.items.map((i) => i[0]) })),
  // ことばの 行は 多いので 半分ずつ（長音（のばす おと）1・2 など）に わけて 練習する
  ...WORD_ROWS.flatMap((r) => {
    const half = Math.ceil(r.items.length / 2)
    return [r.items.slice(0, half), r.items.slice(half)].map((items, i) => ({
      id: `${r.id}${i + 1}`, name: `${r.name}${i + 1}`, label: r.label, group: r.group, kana: items.map((it) => it[0]),
    }))
  }),
]

export const KANA: Kana[] = ROWS.flatMap((r) => r.kana)

export interface KanaInfo {
  char: Kana
  romaji: string
  word: string // 絵の名前（ない ときは ''）
  vowel: Vowel // 音読判定に使う母音（さいごの 音の 母音）
  group: Group
  /** ことばを まるごと よむ カード（周波数解析では 合格に しない：音声認識で 判定） */
  multi: boolean
  /** 既定のカード絵（まだ ないときは ''） */
  image: string
  imageAspect: number // 幅 / 高さ
  /** 絵の上に重ねる文字の位置（%）と大きさ（絵の高さに対する %） */
  letter: { cx: number; cy: number; h: number }
  framed?: boolean
  labels?: { text: string; cx: number; cy: number; h: number }[]
  /** 絵 そのものが 文字（みゅ・りゃ・びゅ）：絵の上に 大きな 文字を 重ねない */
  letterArt?: boolean
  /** カードの下に 小さく 書く ことば（ないときは よみ そのもの） */
  caption: string
  /** caption の うち 赤く する ところ [はじめ, おわり) */
  marks: [number, number][]
}

const VOWEL_OF: Record<string, Vowel> = {}
for (const [v, cs] of Object.entries({
  あ: 'あかさたなはまやらわがざだばぱぁゃ',
  い: 'いきしちにひみりぎじぢびぴぃ',
  う: 'うくすつぬふむゆるぐずづぶぷぅゅ',
  え: 'えけせてねへめれげぜでべぺぇ',
  お: 'おこそとのほもよろをごぞどぼぽぉょ',
}))
  for (const c of cs) VOWEL_OF[c] = v as Vowel

/** よみの さいごの 母音（「きゃ」→あ、「ぎゅう」→う） */
export function lastVowel(s: string): Vowel {
  for (let i = s.length - 1; i >= 0; i--) {
    const v = VOWEL_OF[s[i]]
    if (v) return v
  }
  return 'う' // ん など
}

/** 長音カードの 赤く する ところ（のばす おと） */
const CHOU_MARK: Record<string, string> = {
  おかあさん: 'かあ', おにいさん: 'にい', ふうせん: 'ふう', おねえさん: 'ねえ', こおり: 'こお',
  おとうさん: 'とう', ぼうし: 'ぼう', とけい: 'けい', せんせい: 'せい',
}

/** ことばの なかで 赤く する ところ */
function marksOf(group: Group, char: string, caption: string): [number, number][] {
  const all = (re: RegExp) => [...caption.matchAll(re)].map((m) => [m.index!, m.index! + m[0].length] as [number, number])
  switch (group) {
    case 'chou': {
      const t = CHOU_MARK[caption] ?? ''
      const i = t ? caption.indexOf(t) : -1
      return i >= 0 ? [[i, i + t.length]] : []
    }
    case 'hatsu':
      return all(/ん/g)
    case 'soku':
      return all(/っ/g)
    case 'youchou':
      return all(/[ぁ-ゖ][ゃゅょ]う/g)
    default: {
      const i = caption.indexOf(char)
      return i >= 0 ? [[i, i + char.length]] : []
    }
  }
}

/** カードの絵（src/assets/cards/<ローマ字>.webp）：まんなかに 絵（1000×760、下の あきに ことばを 書く） */
const ART = import.meta.glob('../assets/cards/*.webp', { eager: true, import: 'default' }) as Record<string, string>
const artOf = (romaji: string) => ART[`../assets/cards/${romaji}.webp`] ?? ''

export const KANA_INFO: Record<Kana, KanaInfo> = {}
for (const r of SOUND_ROWS)
  for (const [k, romaji, word] of r.items)
    KANA_INFO[k] = {
      char: k, romaji, word, vowel: lastVowel(k), group: r.group, multi: false,
      image: artOf(romaji), imageAspect: 1000 / 760, letter: { cx: 50, cy: 42, h: k.length > 1 ? 31 : 40 },
      letterArt: !word && !!artOf(romaji),
      caption: word || k, marks: marksOf(r.group, k, word || k),
    }
for (const r of WORD_ROWS)
  for (const [k, romaji] of r.items)
    KANA_INFO[k] = {
      char: k, romaji, word: k, vowel: lastVowel(k), group: r.group, multi: true,
      image: artOf(romaji), imageAspect: 1000 / 760, letter: { cx: 50, cy: 42, h: 31 },
      caption: k, marks: marksOf(r.group, k, k),
    }

export const isMulti = (k: Kana) => !!KANA_INFO[k]?.multi

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
