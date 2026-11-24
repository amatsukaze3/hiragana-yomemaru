/**
 * ローマ字の 文字を 英語の「4本線」に おく しくみ（おおもじ版）
 *  - 文字は Andika（よみかきを ならう 子むけの フォント）。大文字の I だけ セリフ（上下の よこぼう）の ない
 *    1本の たて線に した フォント（AndikaRoma。tools/font/mkfont.py で つくる）。小学校の 大文字と おなじ 形
 *  - 線は 上から ① 大文字の 高さ ② 小文字（x）の 高さ ③ きほんの 線（赤）④ y・g の 下
 *    大文字は ① から ③ までに ちょうど おさまる
 * カード・なぞり書き・判定マスクは みんな この layoutRomaji で 位置を きめる。
 */
export const ROMA_FONT = '"AndikaRoma", "Andika", "Comic Sans MS", sans-serif'
export const ROMA_WEIGHT = 700

/**
 * なぞり書きの 書きはじめ（文字の 外枠に 対する 割合 0〜1。書く じゅんに）
 * 小学校で ならう 大文字の 書きじゅん（たて線は 上から 下、よこ線は 左から 右）：
 *  A 3画（ひだりの ななめ → みぎの ななめ → よこ）・E 4画（たて → 上・中・下の よこ）・F 3画・H 3画（ひだりの たて → みぎの たて → よこ）
 *  K 3画（たて → 右上からの ななめ → まん中から 右下）・M 4画・N 3画・R 2画・T 2画（よこ → たて）・Y 3画
 *  I・U・O・S・C・W は 1画（訓令式の SI・TI・TU・HU も この 文字だけで かける）
 * おなじ 点から はじまる 画（A の 1・2、E の 1・2 など）は、2画めを すこし ずらして 番号が かさならない ように する。
 */
export const LETTER_STROKES: Record<string, [number, number][]> = {
  A: [[0.45, 0.03], [0.56, 0.03], [0.26, 0.68]],
  I: [[0.5, 0.03]],
  U: [[0.14, 0.03]],
  E: [[0.13, 0.03], [0.3, 0.05], [0.3, 0.47], [0.3, 0.95]],
  O: [[0.5, 0.03]],
  K: [[0.12, 0.03], [0.88, 0.03], [0.4, 0.52]],
  S: [[0.85, 0.12]],
  H: [[0.1, 0.03], [0.9, 0.03], [0.3, 0.5]],
  T: [[0.06, 0.05], [0.5, 0.16]],
  C: [[0.88, 0.16]],
  N: [[0.11, 0.03], [0.3, 0.05], [0.89, 0.03]],
  F: [[0.15, 0.03], [0.35, 0.05], [0.35, 0.5]],
  M: [[0.09, 0.03], [0.24, 0.05], [0.5, 0.72], [0.91, 0.03]],
  Y: [[0.08, 0.03], [0.92, 0.03], [0.5, 0.58]],
  R: [[0.14, 0.03], [0.32, 0.05]],
  W: [[0.04, 0.03]],
}

export interface LetterBox {
  ch: string
  x: number // 外枠（px）
  y: number
  w: number
  h: number
}

export interface RomaLayout {
  font: string
  fontSize: number
  x: number // fillText の x（textAlign left）
  baseline: number
  lines: [number, number, number, number] // 4本線の y（px）
  boxes: LetterBox[]
}

let probe: CanvasRenderingContext2D | null = null
const ctx = () => (probe ??= document.createElement('canvas').getContext('2d')!)

function metrics(px: number) {
  const c = ctx()
  c.font = `${ROMA_WEIGHT} ${px}px ${ROMA_FONT}`
  // ① の 線は 大文字の 高さ（H・K の 上）
  const h = c.measureText('HK')
  const x = c.measureText('x')
  const y = c.measureText('yg')
  return { asc: h.actualBoundingBoxAscent, xh: x.actualBoundingBoxAscent, desc: y.actualBoundingBoxDescent }
}

/** 幅 W・高さ H の 箱に、4本線と 文字を おさめる */
export function layoutRomaji(text: string, W: number, H: number, opt: { band?: number; maxW?: number } = {}): RomaLayout {
  const band = opt.band ?? 0.62 // 4本線の 上から下までを 箱の 高さの なん割に するか
  const maxW = opt.maxW ?? 0.84
  const m0 = metrics(100)
  const span0 = m0.asc + m0.desc || 100
  let fs = (100 * H * band) / span0
  const c = ctx()
  c.font = `${ROMA_WEIGHT} ${fs}px ${ROMA_FONT}`
  const w0 = c.measureText(text).width || 1
  if (w0 > W * maxW) fs *= (W * maxW) / w0
  const font = `${ROMA_WEIGHT} ${fs}px ${ROMA_FONT}`
  c.font = font
  const m = metrics(fs)
  const width = c.measureText(text).width
  const x = W / 2 - width / 2
  const span = m.asc + m.desc
  const baseline = H / 2 - span / 2 + m.asc
  const lines: [number, number, number, number] = [baseline - m.asc, baseline - m.xh, baseline, baseline + m.desc]
  c.font = font
  const boxes: LetterBox[] = []
  let adv = 0
  for (const ch of text) {
    const mm = c.measureText(ch)
    const left = x + adv - mm.actualBoundingBoxLeft
    boxes.push({ ch, x: left, y: baseline - mm.actualBoundingBoxAscent, w: mm.actualBoundingBoxLeft + mm.actualBoundingBoxRight, h: mm.actualBoundingBoxAscent + mm.actualBoundingBoxDescent })
    adv = c.measureText(text.slice(0, boxes.length)).width
  }
  return { font, fontSize: fs, x, baseline, lines, boxes }
}

/** 4本線を かく（3本目＝きほんの 線は 赤） */
export function drawFourLines(g: CanvasRenderingContext2D, L: RomaLayout, W: number, pad = 0.05) {
  const gap = L.lines[1] - L.lines[0]
  L.lines.forEach((y, i) => {
    g.beginPath()
    g.lineWidth = Math.max(1.5, gap * 0.045)
    g.strokeStyle = i === 2 ? '#f87171' : '#93c5fd'
    g.setLineDash(i === 1 ? [gap * 0.12, gap * 0.1] : [])
    g.moveTo(W * pad, y)
    g.lineTo(W * (1 - pad), y)
    g.stroke()
  })
  g.setLineDash([])
}

/** 文字ごとの 書きはじめ位置（px）と、ぜんぶの 画数 */
export function strokeStarts(L: RomaLayout): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (const b of L.boxes) for (const [sx, sy] of LETTER_STROKES[b.ch] ?? [[0.5, 0.05]]) out.push({ x: b.x + sx * b.w, y: b.y + sy * b.h })
  return out
}

/** Andika の よみこみを まつ */
export function loadRomaFont(text = 'AIUEOKSHTCNFMYRWZĀ'): Promise<unknown> {
  return document.fonts.load(`${ROMA_WEIGHT} 100px ${ROMA_FONT}`, text).catch(() => undefined)
}
