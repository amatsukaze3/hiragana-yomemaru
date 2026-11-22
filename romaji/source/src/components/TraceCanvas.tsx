import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { type Kana } from '../data/kana'
import { playTick, speak } from '../lib/audio'
import { drawFourLines, layoutRomaji, strokeStarts } from '../lib/fourLines'
import { cardRomaji, useRomajiStyle } from '../lib/romaji'
import { useRomaFontTick } from './RomajiBoard'

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥']
const RATIO = 1.3 // 横長（ローマ字は 横に ならぶ）

type Pt = { x: number; y: number }

interface Props {
  char: Kana
  resetSignal: number
  onComplete?: () => void
}

/**
 * なぞりよみ。4本線の 上の ローマ字を 指や ペンで なぞる。
 * 画数をかぞえ、最後の画をなぞり終えた瞬間にだけ読み上げる（途中の画では読まない）。
 * 書きはじめの 位置は 文字（a・k・s …）ごとに きめてあり（lib/fourLines.ts）、ka なら k → a の じゅん。
 */
export function TraceCanvas({ char, resetSignal, onComplete }: Props) {
  const style = useRomajiStyle()
  const text = cardRomaji(char, style)
  const wrapRef = useRef<HTMLDivElement>(null)
  const guideRef = useRef<HTMLCanvasElement>(null)
  const inkRef = useRef<HTMLCanvasElement>(null)
  const maskRef = useRef<{ data: Uint8ClampedArray; w: number; h: number } | null>(null)
  const strokesRef = useRef<Pt[][]>([]) // 合格した画（0〜1 の座標）
  const currentRef = useRef<Pt[] | null>(null)
  const [size, setSize] = useState(0) // たかさ（はばは size * RATIO）
  const [done, setDone] = useState(0)
  const [hint, setHint] = useState(false)
  const [starts, setStarts] = useState<{ x: number; y: number }[]>([]) // 書きはじめ（0〜1）
  const total = Math.max(1, starts.length)
  const fontTick = useRomaFontTick(text)
  const W = Math.round(size * RATIO)

  // 大きさを決める
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setSize(Math.floor(Math.min(el.clientWidth / RATIO, el.clientHeight)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const lineWidth = size * 0.05

  const drawInk = useCallback(() => {
    const c = inkRef.current
    if (!c || !size) return
    const ctx = c.getContext('2d')!
    const dpr = c.width / W
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, size)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = lineWidth
    const all = [...strokesRef.current, ...(currentRef.current ? [currentRef.current] : [])]
    all.forEach((s, i) => {
      ctx.strokeStyle = i < strokesRef.current.length ? '#8b5cf6' : '#a78bfa'
      ctx.beginPath()
      s.forEach((p, j) => (j ? ctx.lineTo(p.x * W, p.y * size) : ctx.moveTo(p.x * W, p.y * size)))
      if (s.length === 1) ctx.lineTo(s[0].x * W + 0.1, s[0].y * size)
      ctx.stroke()
    })
  }, [size, W, lineWidth])

  // お手本（4本線と うすい 文字）と、判定用のマスクを描く
  useEffect(() => {
    if (!size) return
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    for (const c of [guideRef.current, inkRef.current]) {
      if (!c) continue
      c.width = Math.round(W * dpr)
      c.height = Math.round(size * dpr)
      c.style.width = `${W}px`
      c.style.height = `${size}px`
    }
    const L = layoutRomaji(text, W, size, { band: 0.7, maxW: 0.86 })
    setStarts(strokeStarts(L).map((p) => ({ x: p.x / W, y: p.y / size })))

    const g = guideRef.current!.getContext('2d')!
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, W, size)
    drawFourLines(g, L, W, 0.03)
    g.font = L.font
    g.textBaseline = 'alphabetic'
    g.textAlign = 'left'
    g.fillStyle = '#d6d3d1'
    g.fillText(text, L.x, L.baseline)

    // 判定マスク（線の外にはみ出しても少しは許す）
    const mc = document.createElement('canvas')
    mc.width = W
    mc.height = size
    const mx = mc.getContext('2d')!
    mx.font = L.font
    mx.textBaseline = 'alphabetic'
    mx.fillStyle = '#000'
    mx.strokeStyle = '#000'
    mx.lineJoin = 'round'
    mx.lineWidth = size * 0.09
    mx.fillText(text, L.x, L.baseline)
    mx.strokeText(text, L.x, L.baseline)
    maskRef.current = { data: mx.getImageData(0, 0, W, size).data, w: W, h: size }
    drawInk()
  }, [size, W, text, fontTick, drawInk])

  // リセット
  useEffect(() => {
    strokesRef.current = []
    currentRef.current = null
    setDone(0)
    setHint(false)
    drawInk()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal, char, text])

  const toLocal = (e: React.PointerEvent): Pt => {
    const r = inkRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }

  const onDown = (e: React.PointerEvent) => {
    if (done >= total) return
    e.preventDefault()
    inkRef.current!.setPointerCapture(e.pointerId)
    currentRef.current = [toLocal(e)]
    setHint(false)
    drawInk()
  }

  const onMove = (e: React.PointerEvent) => {
    if (!currentRef.current) return
    const evs = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
    const r = inkRef.current!.getBoundingClientRect()
    for (const ev of evs) currentRef.current.push({ x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height })
    drawInk()
  }

  const onUp = () => {
    const s = currentRef.current
    currentRef.current = null
    if (!s) return
    const mask = maskRef.current
    let len = 0
    let inside = 0
    s.forEach((p, i) => {
      if (i) len += Math.hypot(p.x - s[i - 1].x, p.y - s[i - 1].y)
      if (mask) {
        const px = Math.round(p.x * mask.w)
        const py = Math.round(p.y * mask.h)
        if (px >= 0 && py >= 0 && px < mask.w && py < mask.h && mask.data[(py * mask.w + px) * 4 + 3] > 40) inside++
      }
    })
    const ok = len >= 0.07 && inside / s.length >= 0.6
    if (!ok) {
      setHint(true)
      drawInk()
      return
    }
    strokesRef.current.push(s)
    const n = strokesRef.current.length
    setDone(n)
    drawInk()
    if (n >= total) {
      // ★ 最後の画をなぞり終えた瞬間にだけ読み上げる
      speak(char)
      onComplete?.()
    } else {
      playTick()
    }
  }

  const finished = done >= total

  return (
    <div className="flex h-full w-full flex-col items-center gap-3">
      {/* 書き順バッジ ①②③ */}
      <ol className="flex items-center gap-2" aria-label={`${total}かく`}>
        {Array.from({ length: total }, (_, i) => {
          const state = i < done ? 'done' : i === done ? 'now' : 'todo'
          return (
            <li key={i}>
              <motion.span
                className={[
                  'flex h-12 w-12 items-center justify-center rounded-full border-4 text-2xl font-bold',
                  state === 'done' && 'border-violet-500 bg-violet-500 text-white',
                  state === 'now' && 'border-violet-500 bg-white text-violet-600',
                  state === 'todo' && 'border-stone-200 bg-white text-stone-300',
                ]
                  .filter(Boolean)
                  .join(' ')}
                animate={state === 'now' ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={state === 'now' ? { duration: 1.2, repeat: Infinity } : undefined}
              >
                {CIRCLED[i]}
              </motion.span>
            </li>
          )
        })}
        <li className="ml-2 text-lg text-stone-500">
          {finished ? 'できた！' : `${done + 1}かくめ`}
        </li>
      </ol>

      <div ref={wrapRef} className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        <div
          className="no-touch-scroll relative overflow-hidden rounded-[28px] border-4 border-amber-200 bg-white shadow-[0_6px_0_#fde68a]"
          style={{ width: W, height: size }}
        >
          <canvas ref={guideRef} className="absolute inset-0" aria-hidden />
          {/* 書きはじめの番号 */}
          {!finished &&
            starts.map(({ x: sx, y: sy }, i) =>
              i < done ? null : (
                <motion.span
                  key={i}
                  className={[
                    'pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-bold',
                    i === done ? 'h-9 w-9 bg-violet-500 text-lg text-white shadow' : 'h-7 w-7 bg-amber-100 text-sm text-amber-700',
                  ].join(' ')}
                  style={{ left: `${sx * 100}%`, top: `${sy * 100}%` }}
                  animate={i === done ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                  transition={i === done ? { duration: 1, repeat: Infinity } : undefined}
                >
                  {i + 1}
                </motion.span>
              ),
            )}
          <canvas
            ref={inkRef}
            className="no-touch-scroll absolute inset-0"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            aria-label={`「${text}」をなぞる`}
          />
          <AnimatePresence>
            {hint && (
              <motion.p
                className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-lg text-violet-700"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                もじの うえを なぞってね
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
