/**
 * ローマ字の 文字を 英語の「4本線」に おく しくみ
 *  - 文字は Andika（よみかきを ならう 子むけの フォント。a・g が 手書きと おなじ 形）
 *  - 線は 上から ① 大文字・h の 高さ ② 小文字（x）の 高さ ③ きほんの 線（赤）④ y・g の 下
 * カード・なぞり書き・判定マスクは みんな この layoutRomaji で 位置を きめる。
 */
export const ROMA_FONT = '"AndikaRoma", "Andika", "Comic Sans MS", sans-serif'
export const ROMA_WEIGHT = 700

/** なぞり書きの 書きはじめ（文字の 外枠に 対する 割合 0〜1。上から じゅんに） */
export const LETTER_STROKES: Record<string, [number, number][]> = {
  a: [[0.82, 0.16]],
  i: [[0.5, 0.36], [0.5, 0.06]],
  u: [[0.12, 0.05]],
  e: [[0.1, 0.5]],
  o: [[0.6, 0.05]],
  k: [[0.13, 0.03], [0.88, 0.36]],
  s: [[0.85, 0.15]],
  h: [[0.13, 0.03]],
  t: [[0.38, 0.04], [0.05, 0.3]],
  c: [[0.88, 0.17]],
  n: [[0.13, 0.05]],
  f: [[0.9, 0.08], [0.05, 0.34]],
  m: [[0.08, 0.05]],
  y: [[0.05, 0.03], [0.95, 0.03]],
  r: [[0.13, 0.05]],
  w: [[0.03, 0.04]],
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
  const h = c.measureText('hk')
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
export function loadRomaFont(text = 'aiueokshtcnfmyrwā'): Promise<unknown> {
  return document.fonts.load(`${ROMA_WEIGHT} 100px ${ROMA_FONT}`, text).catch(() => undefined)
}
