/**
 * 音声認識（Google・Apple）の けっかの 文字と、目標の 文字（46もじ）を くらべる。
 *
 * 1もじだけを よむと、音声認識は ひらがな・カタカナ・漢字・英字・数字の どれでも かえす（「ら」→「ラ」「等」「Ra」「La」…）。
 * ここで ぜんぶ ひらがなの よみに なおし、つぎの どれかに わける：
 *
 *   match      … 目標の 文字（「ら」「らー」「ららら」「等」「Ra」「あら」など）
 *   variant    … こどもの はつおんの くせで かわった 音（ら行の はじき：ら→だ、り→ぢ・じ・でぃ、る→づ・ず・どぅ、れ→で、ろ→ど）
 *   vowel      … 目標の 母音だけ（「ら」に「あ」）。母音だけの よみは 合格に しない（子音の 手がかりが ある ときだけ engine が つかう）
 *   confusable … 形の にた 文字（ら↔う・ち、り↔い、る↔ろ、れ↔ね・わ、ラ↔フ・ヲ、ロ↔コ、ra↔na など）
 *   other      … ちがう みじかい かな（ほかの 文字を よんだ）
 *   long / empty … ながい ことば・なにも ない
 */
import { KANA46, hasConsonant, specOf, toHiragana, type Vowel } from './kana46.ts'

/** アプリの 文字の しゅるい（形の にた 文字が ちがう） */
export type Script = 'hira' | 'kata' | 'roma' | 'ROMA'

export type HeardKind = 'match' | 'variant' | 'vowel' | 'confusable' | 'other' | 'long' | 'empty'

export interface Heard {
  kind: HeardKind
  /** みじかい かなの とき、きこえた よみ（ひらがな） */
  reading?: string
}

/* ---------- よみの 表 ---------- */

/**
 * 1もじの 目標に たいして、音声認識が かえす 漢字・英字・数字。
 * 同じ 漢字が 2つの 文字に はいって いても よい（「日」は か・ひ）
 */
const HOMOPHONES: Record<string, string[]> = {
  あ: ['亜', '阿', '吾', 'ah', 'aa', 'ahh'],
  い: ['胃', '井', '意', '位', '衣', '医', '異', '亥', '易', '以', '良い', 'e', 'ee'],
  う: ['鵜', '宇', '卯', '有', '雨', '羽', '右', 'oo', 'ooh'],
  え: ['絵', '柄', '江', '餌', '重', '会', '恵', 'a', 'eh'],
  お: ['尾', '緒', '御', '於', '小', '雄', '男', 'を', 'o', 'oh'],
  か: ['蚊', '可', '課', '科', '化', '火', '下', '加', '価', '家', '歌', '日', 'ka'],
  き: ['木', '気', '黄', '期', '機', '器', '危', '記', '起', '生', '樹', 'ki', 'key'],
  く: ['九', '区', '句', '苦', '来', '具', '9', 'ku'],
  け: ['毛', '家', '気', '化', 'k', 'ke'],
  こ: ['子', '粉', '個', '小', '故', '戸', '湖', '古', 'ko'],
  さ: ['差', '左', '佐', '砂', 'sa'],
  し: ['四', '死', '詩', '市', '氏', '師', '士', '詞', '4', 'c', 'she', 'see', 'shi'],
  す: ['酢', '巣', '素', '須', '州', 'su'],
  せ: ['背', '瀬', '世', '是', 'se'],
  そ: ['祖', '素', '其', 'so'],
  た: ['田', '他', '多', '太', 'ta'],
  ち: ['血', '地', '知', '千', '智', '池', '値', 'chi'],
  つ: ['津', '都', 'tsu'],
  て: ['手', 'te'],
  と: ['戸', '都', '十', '斗', '図', '徒', '10', 'to'],
  な: ['菜', '名', '那', 'na'],
  に: ['二', '荷', '似', '尼', '煮', '2', 'ni'],
  ぬ: ['奴', 'nu'],
  ね: ['根', '寝', '値', '音', '子', 'ne'],
  の: ['野', '乃', '之', 'no'],
  は: ['葉', '歯', '刃', '派', '羽', '波', 'わ', 'ha'],
  ひ: ['日', '火', '非', '比', '陽', '灯', '碑', 'hi'],
  ふ: ['府', '布', '負', '風', '符', '婦', '譜', 'fu'],
  へ: ['屁', '辺', '経', 'え', 'he'],
  ほ: ['帆', '歩', '穂', '保', '補', 'ho'],
  ま: ['間', '真', '魔', '馬', '麻', 'ma'],
  み: ['実', '身', '三', '見', '美', '未', '味', '巳', '3', 'me', 'mi'],
  む: ['無', '六', '夢', '務', '武', '鵡', '6', 'μ', 'moo', 'mu'],
  め: ['目', '芽', '女', '雌', 'me'],
  も: ['藻', '喪', '茂', 'mo'],
  や: ['矢', '屋', '夜', '八', '野', '哉', '8', 'ya'],
  ゆ: ['湯', '油', '由', 'u', 'you', 'yu'],
  よ: ['世', '夜', '四', '代', '余', '予', '与', 'yo'],
  // ら行：こどもの ら行は 音声認識が とくに まちがえやすいので、英語の ことば（La・Lee・Lou・Ray・Low）も ひろく
  ら: ['等', '羅', '良', '裸', '螺', '拉', '蘭', 'la', 'lah', 'laa', 'ra', 'rah', 'raa'],
  り: ['利', '理', '里', '李', '梨', '吏', '離', '裏', '璃', '履', '痢', '莉', '鯉', 'li', 'lee', 'lea', 'leigh', 'ree', 'ri', 'rie', 'rhee'],
  る: ['留', '流', '瑠', '類', '涙', '塁', 'lu', 'loo', 'lou', 'lew', 'ru', 'rue', 'roo', 'ruu'],
  れ: ['礼', '例', '零', '霊', '令', '冷', '麗', '齢', '隷', '励', '鈴', '0', '〇', 'le', 'leh', 'lay', 're', 'reh', 'ray', 'rei'],
  ろ: ['炉', '路', '六', '呂', '露', '櫓', '魯', '老', '労', '郎', '朗', '廊', '楼', '蝋', '濾', 'lo', 'low', 'law', 'ro', 'row', 'roe', 'rho'],
  わ: ['輪', '和', '話', '環', 'は', 'wa'],
  を: ['お', '尾', '緒', '御', 'o', 'oh', 'wo'],
  ん: ['うん', 'ん', 'n', 'm'],
}

/** よみ（漢字・英字・数字）→ その よみの 文字（ひとつの ことばが 2つの 文字に なる ことも ある） */
const READ_OF = new Map<string, string[]>()
for (const [k, list] of Object.entries(HOMOPHONES))
  for (const w of list) {
    const a = READ_OF.get(w) ?? []
    if (!a.includes(k)) a.push(k)
    READ_OF.set(w, a)
  }

/**
 * こどもの ら行（はじき）の かわりかた。子音は でて いるので「母音だけ」の よみでは ない。
 * ら→だ（いちばん おおい）、り→ぢ・じ・でぃ、る→づ・ず・どぅ、れ→で、ろ→ど。
 * 母音が おなじ ものだけ（る を ど と きいても とおさない：る↔ろ は 形の にた 文字）
 */
const CHILD_VARIANTS: Record<string, string[]> = {
  ら: ['だ'],
  り: ['ぢ', 'じ', 'でぃ'],
  る: ['づ', 'ず', 'どぅ'],
  れ: ['で'],
  ろ: ['ど'],
}

/**
 * 形の にた 文字（よみまちがえ やすい）。音声認識の いちばん めの こたえが これなら、
 * 2ばんめ いこうに 目標が あっても 合格に しない。周波数解析の 合格も とりけす
 */
const CONFUSABLE: Record<Script, Record<string, string>> = {
  hira: {
    あ: 'おめの', い: 'りこけ', う: 'らつ', え: 'んそ', お: 'あむ',
    か: 'やわ', き: 'さちま', く: 'へし', け: 'はにい', こ: 'いにて',
    さ: 'ちきそ', し: 'つもん', す: 'むお', せ: 'さや', そ: 'てろん',
    た: 'なに', ち: 'さらろる', つ: 'しう', て: 'そと', と: 'こて',
    な: 'たふ', に: 'けこた', ぬ: 'めねる', ね: 'れわぬ', の: 'めあ',
    は: 'ほけよ', ひ: 'いこ', ふ: 'な', へ: 'く', ほ: 'はま',
    ま: 'ほよも', み: 'るの', む: 'すお', め: 'ぬあの', も: 'しま',
    や: 'かせ', ゆ: 'よわ', よ: 'まゆは',
    ら: 'うちさ', り: 'いこけ', る: 'ろぬち', れ: 'ねわ', ろ: 'るうち',
    わ: 'れね', を: 'おと', ん: 'そえし',
  },
  kata: {
    あ: 'まや', い: 'とり', う: 'わらふ', え: 'ゆこ', お: 'ほね',
    か: 'やせ', き: 'もさ', く: 'たけわす', け: 'くたな', こ: 'ゆろえ',
    さ: 'せき', し: 'つみん', す: 'ぬくらふ', せ: 'さやか', そ: 'んりつ',
    た: 'くけぬ', ち: 'てな', つ: 'しそん', て: 'ちら', と: 'い',
    な: 'めち', に: 'こゆみ', ぬ: 'すめた', ね: 'ほお', の: 'めん',
    は: 'るそ', ひ: 'と', ふ: 'わらをう', へ: '', ほ: 'おね',
    ま: 'あむや', み: 'しに', む: 'まや', め: 'なぬの', も: 'きち',
    や: 'ませあか', ゆ: 'こえ', よ: 'をゆこ',
    ら: 'ふをうて', り: 'そんの', る: 'れのは', れ: 'るしん', ろ: 'こよ',
    わ: 'うふく', を: 'よふら', ん: 'そしつり',
  },
  // ローマ字（小文字）：子音の 字の 形が にて いる（r↔n、n↔m・h、h↔k）
  roma: {
    あ: 'お', う: 'ん', お: 'あ',
    か: 'は', き: 'ひ', け: 'へ', こ: 'ほ',
    な: 'まらは', に: 'みりひ', ぬ: 'むるふ', ね: 'めれへ', の: 'もろほ',
    は: 'なか', ひ: 'にき', へ: 'ねけ', ほ: 'のこ',
    ま: 'な', み: 'に', む: 'ぬ', め: 'ね', も: 'の',
    ら: 'な', り: 'に', る: 'ぬ', れ: 'ね', ろ: 'の',
    わ: 'ま', を: 'も', ん: 'うま',
  },
  // ローマ字（大文字）：R↔P・B・K、M↔N↔W、E↔F
  ROMA: {
    か: 'ら', き: 'り', く: 'る', け: 'れ', こ: 'ろ',
    な: 'まわ', に: 'み', ぬ: 'む', ね: 'め', の: 'も',
    ま: 'なわ', み: 'に', む: 'ぬ', め: 'ね', も: 'の',
    ら: 'かぱば', り: 'きぴび', る: 'くぷぶ', れ: 'けぺべ', ろ: 'こぽぼ',
    わ: 'まな', を: 'も',
  },
}

/* ---------- 文字の あつかい ---------- */

const SMALL = 'ぁぃぅぇぉゃゅょゎ'
const SEP = /[\s、。．.,!！?？・･]+/
const MARKS = /[〜~ー－―‐-「」『』"'`’”（）()]/g

/** 音声認識の 文字を ひらがな・小文字に そろえる */
function base(raw: string) {
  return toHiragana(raw.normalize('NFKC').toLowerCase())
}

/** かなを 1つの 音ごとに わける（「でぃ」「しゃ」は 1つ） */
export function morae(s: string): string[] {
  const out: string[] = []
  for (const c of s) {
    if (SMALL.includes(c) && out.length && !/^[あいうえお]$/.test(out[out.length - 1])) out[out.length - 1] += c
    else out.push(c)
  }
  return out
}

const LATIN_SYL: [string, string][] = [
  ['shi', 'し'], ['chi', 'ち'], ['tsu', 'つ'], ['sha', 'しゃ'], ['shu', 'しゅ'], ['sho', 'しょ'], ['she', 'しぇ'],
  ['cha', 'ちゃ'], ['chu', 'ちゅ'], ['cho', 'ちょ'], ['dzu', 'づ'], ['dhi', 'でぃ'],
  ['ka', 'か'], ['ki', 'き'], ['ku', 'く'], ['ke', 'け'], ['ko', 'こ'],
  ['sa', 'さ'], ['si', 'し'], ['su', 'す'], ['se', 'せ'], ['so', 'そ'],
  ['ta', 'た'], ['ti', 'ち'], ['tu', 'つ'], ['te', 'て'], ['to', 'と'],
  ['na', 'な'], ['ni', 'に'], ['nu', 'ぬ'], ['ne', 'ね'], ['no', 'の'],
  ['ha', 'は'], ['hi', 'ひ'], ['fu', 'ふ'], ['hu', 'ふ'], ['he', 'へ'], ['ho', 'ほ'],
  ['ma', 'ま'], ['mi', 'み'], ['mu', 'む'], ['me', 'め'], ['mo', 'も'],
  ['ya', 'や'], ['yu', 'ゆ'], ['yo', 'よ'],
  ['ra', 'ら'], ['ri', 'り'], ['ru', 'る'], ['re', 'れ'], ['ro', 'ろ'],
  ['la', 'ら'], ['li', 'り'], ['lu', 'る'], ['le', 'れ'], ['lo', 'ろ'],
  ['wa', 'わ'], ['wo', 'を'],
  ['ga', 'が'], ['gi', 'ぎ'], ['gu', 'ぐ'], ['ge', 'げ'], ['go', 'ご'],
  ['za', 'ざ'], ['ji', 'じ'], ['zi', 'じ'], ['zu', 'ず'], ['ze', 'ぜ'], ['zo', 'ぞ'],
  ['da', 'だ'], ['di', 'でぃ'], ['du', 'どぅ'], ['de', 'で'], ['do', 'ど'],
  ['ba', 'ば'], ['bi', 'び'], ['bu', 'ぶ'], ['be', 'べ'], ['bo', 'ぼ'],
  ['pa', 'ぱ'], ['pi', 'ぴ'], ['pu', 'ぷ'], ['pe', 'ぺ'], ['po', 'ぽ'],
  ['ja', 'じゃ'], ['ju', 'じゅ'], ['jo', 'じょ'],
  ['a', 'あ'], ['i', 'い'], ['u', 'う'], ['e', 'え'], ['o', 'お'],
]

/** ローマ字の ことば（ra・lala・rii・kan）を かなに。ローマ字に ならなければ null */
export function latinToKana(w: string): string | null {
  if (!/^[a-z]+$/.test(w)) return null
  let out = ''
  let i = 0
  while (i < w.length) {
    const hit = LATIN_SYL.find(([r]) => w.startsWith(r, i))
    if (hit) {
      out += hit[1]
      i += hit[0].length
      continue
    }
    // ん（n・m の あとに 母音が ない）、h（rah・ah の のばす h）
    if ((w[i] === 'n' || w[i] === 'm') && !/[aiueoy]/.test(w[i + 1] ?? '')) {
      out += 'ん'
      i++
      continue
    }
    if (w[i] === 'h' && i > 0 && i === w.length - 1) {
      i++
      continue
    }
    return null
  }
  return out
}

/** 英語の 文字・ことばの よみ（ローマ字に ならない もの）。こどもの ら行の かわりかた（でぃ・じ）など */
const LATIN_EXTRA: Record<string, string> = { dee: 'でぃ', d: 'でぃ', jee: 'じ', zoo: 'ず', doo: 'どぅ', day: 'で', dough: 'ど', doe: 'ど' }

/** ひとつの ことばの よみの こうほ（ひらがな） */
function readingsOfWord(w: string): string[] {
  const out = new Set<string>()
  const plain = w.replace(MARKS, '').replace(/っ$/, '')
  if (!plain) return []
  if (/^[ぁ-ゖ]+$/.test(plain)) out.add(plain)
  for (const k of READ_OF.get(plain) ?? []) out.add(k)
  if (LATIN_EXTRA[plain]) out.add(LATIN_EXTRA[plain])
  const lat = latinToKana(plain)
  if (lat) out.add(lat)
  return [...out]
}

export interface Norm {
  /** くぎりを のぞいて つなげた もの */
  compact: string
  /** ことば ごと */
  words: string[]
}

export function normalize(raw: string): Norm {
  const b = base(raw)
  const words = b
    .split(SEP)
    .map((w) => w.replace(MARKS, ''))
    .filter(Boolean)
  return { compact: words.join(''), words }
}

/** かなの ならびが「目標の 音 x」の よみか（x・xx・xー・xあ・xん・あx） */
function moraFits(x: string, r: string, vowel: string, allowLast: boolean): boolean {
  const s = r.replace(/[ーっ]/g, '')
  if (!s) return false
  if (s === x) return true
  const ms = morae(s)
  if (ms.every((m) => m === x)) return true // ららら
  // xあ・xい・xん（3もじ まで）：のばす・つぎの 音に うつる とちゅう
  if (ms.length <= 3 && ms[0] === x && ms.slice(1).every((m) => /^[あいうえおぁぃぅぇぉん]$/.test(m))) return true
  // 母音＋x（「あら」：出だしに 母音が ついた）
  if (ms.length === 2 && ms[1] === x && (ms[0] === vowel || ms[0] === x)) return true
  // つながって かえって きた（「かきく」「なら」）：さいごの 1つ。
  // ただし 母音の 目標で、まえの 音を のばした だけ（「かあ」の あ）は のぞく
  if (allowLast && ms.length >= 2 && ms.length <= 6 && /^[ぁ-ゖ]+$/.test(s) && ms[ms.length - 1] === x) {
    const prev = KANA46[ms[ms.length - 2]]
    if (!(KANA46[x]?.cls === 'V' && prev && prev.vowel === x)) return true
  }
  return false
}

/** 目標の 母音だけ（あ・ああ・あー・ぁ） */
function vowelOnly(r: string, vowel: string) {
  const s = r.replace(/[ーっ]/g, '')
  const small = 'ぁぃぅぇぉ'['あいうえお'.indexOf(vowel)]
  return !!s && [...s].every((c) => c === vowel || c === small)
}

function isShortKana(r: string) {
  return /^[ぁ-ゖー]{1,3}$/.test(r)
}

/**
 * ひとつの 音声認識の けっか（1つの こうほ）を、目標の 文字 target（ひらがな・カタカナ）に たいして わける
 */
export function classify(target: string, raw: string, script: Script = 'hira'): Heard {
  const sp = specOf(target)
  if (!sp) return { kind: 'empty' }
  const t = sp.hira
  const { compact, words } = normalize(raw)
  if (!compact) return { kind: 'empty' }
  const last = words[words.length - 1] ?? ''
  const variants = CHILD_VARIANTS[t] ?? []
  // ぜんたい と さいごの ことば の よみ
  const whole = readingsOfWord(compact)
  const lastR = words.length > 1 ? readingsOfWord(last) : []
  const cands = [...whole, ...lastR]
  for (const r of cands) if (moraFits(t, r, sp.vowel, true)) return { kind: 'match', reading: r }
  for (const d of variants) for (const r of cands) if (moraFits(d, r, sp.vowel, false)) return { kind: 'variant', reading: r }
  // ここから 合格では ない：なにを きいたか（こうほが いくつか ある ときは 母音だけ → 形の にた 文字 → ほかの 文字 の じゅん）
  const shorts = cands.filter((r) => isShortKana(r))
  if (shorts.length) {
    const v = sp.cls !== 'V' && t !== 'ん' ? shorts.find((r) => vowelOnly(r, sp.vowel)) : undefined
    if (v !== undefined) return { kind: 'vowel', reading: v }
    const conf = CONFUSABLE[script][t] ?? ''
    const c = shorts.find((r) => conf.includes(morae(r.replace(/[ーっ]/g, ''))[0] ?? '_'))
    if (c !== undefined) return { kind: 'confusable', reading: c }
    return { kind: 'other', reading: shorts[0] }
  }
  // よみが わからない（英語の ことば・漢字の ことば）・ながい：ちがう 文字を よんだ とは いえない
  return { kind: 'long', reading: cands[0] }
}

export interface TargetHit {
  /** 合格した 目標（アプリの 文字の キー） */
  kana: string
  kind: 'match' | 'variant'
  /** なんばんめの こうほ（0：いちばん） */
  alt: number
}

/**
 * 音声認識の こうほ（いちばん から じゅんに）と、目標たち（さいしょが いちばん ねらう もの）。
 * どれかの こうほが どれかの 目標に あえば その 目標を かえす。
 * 2ばんめ いこうの こうほで あった ときは、いちばんの こうほが「ちがう 文字」「形の にた 文字」で ない ときだけ
 * （いちばんが 母音だけ「あ」・ながい ことば・おなじ よみの べつの 書きかた の ときは 2ばんめ いこうも みる。
 *   いちばんが「な」なのに 3ばんめの「ら」で 合格には しない）
 */
export function matchTargets(targets: string[], alts: string[], script: Script = 'hira'): TargetHit | null {
  for (let j = 0; j < alts.length; j++) {
    const t = alts[j]
    if (!t) continue
    for (const k of targets) {
      const h = classify(k, t, script)
      if (h.kind !== 'match' && h.kind !== 'variant') continue
      if (j > 0) {
        const top = classify(k, alts[0], script).kind
        if (top === 'confusable' || top === 'other') continue
      }
      return { kana: k, kind: h.kind, alt: j }
    }
  }
  return null
}

/* ---------- ぼおん ごうかく（先生が せんせいメニューで きりかえる） ---------- */

/** かなの 母音（あ段・い段 …）。きゃ・でぃ・どぅ の ような 音は さいごの 小さい かなの 母音。ん・っ は null */
const VOWEL_OF_KANA: Record<string, Vowel> = {}
for (const [v, s] of [
  ['あ', 'あかさたなはまやらわがざだばぱぁゃゎ'],
  ['い', 'いきしちにひみりゐぎじぢびぴぃ'],
  ['う', 'うくすつぬふむゆるぐずづぶぷぅゅゔ'],
  ['え', 'えけせてねへめれゑげぜでべぺぇ'],
  ['お', 'おこそとのほもよろをごぞどぼぽぉょ'],
] as [Vowel, string][])
  for (const c of s) VOWEL_OF_KANA[c] = v

export function moraVowel(m: string): Vowel | null {
  return VOWEL_OF_KANA[m[m.length - 1]] ?? null
}

/**
 * みじかい よみ（1〜3つの 音）の 母音：さいしょの 音の 母音。あとに つづいて よいのは おなじ 音の くりかえし・母音・ん だけ
 * （「た」「たー」「たた」「たあ」「たん」）。ちがう 音が まじる（「たき」）・ながい ときは null
 */
export function readingVowel(r: string): Vowel | null {
  const s = r.replace(/[ーっ]/g, '')
  if (!s || !/^[ぁ-ゖ]+$/.test(s)) return null
  const ms = morae(s)
  if (ms.length > 3) return null
  const v = moraVowel(ms[0])
  if (!v) return null
  for (const m of ms.slice(1)) if (m !== ms[0] && !/^[あいうえおぁぃぅぇぉん]$/.test(m)) return null
  return v
}

/**
 * ぼおん ごうかく：音声認識の けっか raw が、目標 target と おなじ 母音の みじかい よみか（子音は みない）。
 * 「か」に「あ」「た」「かー」「たた」「田」「ta」など。構音が 育ちとちゅうの 子は 子音が ぬけたり（か→あ）
 * ほかの 子音に かわったり（か→た、さ→た・しゃ、ら→だ・や）するので、母音だけで きめる。
 * あ行・を・ん の 目標には つかわない（これまでどおり）
 */
export function vowelFits(target: string, raw: string): boolean {
  if (!hasConsonant(target)) return false
  const v = specOf(target)!.vowel
  const { compact, words } = normalize(raw)
  if (!compact) return false
  const cands = [...readingsOfWord(compact), ...(words.length > 1 ? readingsOfWord(words[words.length - 1]) : [])]
  return cands.some((r) => readingVowel(r) === v)
}

/**
 * ぼおん ごうかく の matchTargets：おなじ 母音の よみで あう 目標（子音の ある 文字だけ。いちばんめの 目標から じゅんに）。
 * 2ばんめ いこうの こうほは、いちばんの こうほが「ちがう 文字」「形の にた 文字」の ときは みない（matchTargets と おなじ）
 */
export function matchVowelTargets(targets: string[], alts: string[], script: Script = 'hira'): { kana: string; alt: number } | null {
  for (let j = 0; j < alts.length; j++) {
    const t = alts[j]
    if (!t) continue
    for (const k of targets) {
      if (!vowelFits(k, t)) continue
      if (j > 0) {
        const top = classify(k, alts[0], script).kind
        if (top === 'confusable' || top === 'other') continue
      }
      return { kana: k, alt: j }
    }
  }
  return null
}

/** テスト用 */
export const _tables = { HOMOPHONES, CHILD_VARIANTS, CONFUSABLE, KANA46 }
