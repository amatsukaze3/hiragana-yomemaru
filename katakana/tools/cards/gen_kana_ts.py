"""katakana/source/src/data/kana.ts を つくる（カードの 文字の いち は カード絵を つくったときの pos.json から）"""
import json, sys
K = json.load(open(sys.argv[1]))      # kana.json（もじ・ローマ字・絵の なまえ）
POS = json.load(open(sys.argv[2]))    # pos.json（文字の まんなか %）
OUT = sys.argv[3]

VOWEL = {}
for c, v in zip('アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
                'あいうえおあいうえおあいうえおあいうえおあいうえおあいうえおあいうえおあうおあいうえおあおう'):
    VOWEL[c] = v

# 画数と 書きはじめの いち（字形の 外枠に たいする わりあい 0〜1）。教科書の 書き順
STROKES = {
 'ア': [[0.08, 0.1], [0.5, 0.42]],
 'イ': [[0.85, 0.03], [0.55, 0.42]],
 'ウ': [[0.5, 0.02], [0.08, 0.28], [0.3, 0.2]],
 'エ': [[0.12, 0.08], [0.5, 0.15], [0.02, 0.92]],
 'オ': [[0.03, 0.3], [0.62, 0.03], [0.42, 0.42]],
 'カ': [[0.08, 0.28], [0.4, 0.03]],
 'キ': [[0.1, 0.25], [0.03, 0.58], [0.42, 0.03]],
 'ク': [[0.42, 0.03], [0.32, 0.2]],
 'ケ': [[0.3, 0.03], [0.32, 0.36], [0.66, 0.38]],
 'コ': [[0.06, 0.06], [0.06, 0.94]],
 'サ': [[0.02, 0.32], [0.28, 0.03], [0.7, 0.03]],
 'シ': [[0.1, 0.06], [0.03, 0.42], [0.1, 0.94]],
 'ス': [[0.1, 0.1], [0.58, 0.56]],
 'セ': [[0.02, 0.42], [0.35, 0.03]],
 'ソ': [[0.05, 0.12], [0.85, 0.05]],
 'タ': [[0.4, 0.03], [0.32, 0.2], [0.35, 0.52]],
 'チ': [[0.8, 0.03], [0.02, 0.42], [0.5, 0.22]],
 'ツ': [[0.05, 0.18], [0.4, 0.06], [0.9, 0.06]],
 'テ': [[0.12, 0.06], [0.02, 0.42], [0.5, 0.45]],
 'ト': [[0.2, 0.03], [0.25, 0.45]],
 'ナ': [[0.02, 0.32], [0.55, 0.03]],
 'ニ': [[0.1, 0.1], [0.02, 0.9]],
 'ヌ': [[0.1, 0.08], [0.3, 0.48]],
 'ネ': [[0.45, 0.03], [0.1, 0.3], [0.5, 0.52], [0.72, 0.56]],
 'ノ': [[0.9, 0.05]],
 'ハ': [[0.35, 0.06], [0.65, 0.06]],
 'ヒ': [[0.15, 0.42], [0.1, 0.03]],
 'フ': [[0.05, 0.1]],
 'ヘ': [[0.02, 0.62]],
 'ホ': [[0.05, 0.3], [0.5, 0.03], [0.2, 0.56], [0.75, 0.56]],
 'マ': [[0.05, 0.1], [0.45, 0.56]],
 'ミ': [[0.1, 0.06], [0.15, 0.42], [0.05, 0.76]],
 'ム': [[0.4, 0.03], [0.75, 0.62]],
 'メ': [[0.8, 0.03], [0.25, 0.35]],
 'モ': [[0.15, 0.08], [0.02, 0.46], [0.42, 0.03]],
 'ヤ': [[0.02, 0.36], [0.35, 0.03]],
 'ユ': [[0.1, 0.2], [0.02, 0.9]],
 'ヨ': [[0.1, 0.06], [0.15, 0.48], [0.05, 0.93]],
 'ラ': [[0.15, 0.05], [0.05, 0.36]],
 'リ': [[0.15, 0.05], [0.8, 0.03]],
 'ル': [[0.3, 0.06], [0.62, 0.03]],
 'レ': [[0.12, 0.03]],
 'ロ': [[0.05, 0.12], [0.22, 0.04], [0.15, 0.95]],
 'ワ': [[0.05, 0.1], [0.28, 0.04]],
 'ヲ': [[0.05, 0.05], [0.05, 0.42], [0.9, 0.06]],
 'ン': [[0.06, 0.15], [0.1, 0.94]],
}
ROWS = [('a', 'ア行', 'アイウエオ'), ('ka', 'カ行', 'カキクケコ'), ('sa', 'サ行', 'サシスセソ'), ('ta', 'タ行', 'タチツテト'), ('na', 'ナ行', 'ナニヌネノ'),
        ('ha', 'ハ行', 'ハヒフヘホ'), ('ma', 'マ行', 'マミムメモ'), ('ya', 'ヤ行', 'ヤユヨ'), ('ra', 'ラ行', 'ラリルレロ'), ('wa', 'ワ行', 'ワヲン')]

L = []
for it in K:
    L.append(f"import {it['romaji']}Img from '../assets/cards/{it['romaji']}.webp'")
L.append('')
L.append("""export type Kana = string
/** 音読判定に使う母音（判定エンジンの中では ひらがなで あつかう） */
export type Vowel = 'あ' | 'い' | 'う' | 'え' | 'お'

export interface Row {
  id: string
  name: string // ア行
  kana: Kana[]
}
""")
L.append('export const ROWS: Row[] = [')
for rid, name, ks in ROWS:
    L.append(f"  {{ id: '{rid}', name: '{name}', kana: [{', '.join(repr(c) for c in ks)}] }},")
L.append(']')
L.append("""
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

export const KANA_INFO: Record<Kana, KanaInfo> = {""")
for it in K:
    c, r, w = it['char'], it['romaji'], it['word']
    p = POS[r]
    ss = STROKES[c]
    L.append(f"  {c}: {{ char: '{c}', romaji: '{r}', word: '{w}', vowel: '{VOWEL[c]}', strokes: {len(ss)}, strokeStarts: {json.dumps(ss)}, image: {r}Img, imageAspect: 1000 / 760, framed: true, letter: {{ cx: {p['cx']}, cy: {p['cy']}, h: 43.0 }} }},")
L.append('}')
L.append('''
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
''')
open(OUT, 'w').write('\n'.join(L))
print('ok', len(K))
