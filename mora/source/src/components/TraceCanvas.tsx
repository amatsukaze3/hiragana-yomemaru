import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { type Kana } from '../data/kana'
import { speak } from '../lib/audio'

const CARD_FONT = '"YomemaruCardUser", "YomemaruNKB", "UD Digi Kyokasho NK-B", "Klee One", "BIZ UDMincho", serif'

type Pt = { x: number; y: number }

interface Props {
  char: Kana
  resetSignal: number
  /** なぞって 指を はなしたとき */
  onComplete?: () => void
}

/**
 * なぞりよみ（スペシャルモーラ版）。うすく出した もじの 上を 指で なぞる。
 * 「きゃ」「おかあさん」のように 何文字も あるので、画数は かぞえず 自由に なぞる。
 * なぞり おわって 指を はなすと、よみを 読み上げる（つづけて なぞる ときは 1.2秒 あけて）。
 */
export function TraceCanvas({ char, resetSignal, onComplete }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const guideRef = useRef<HTMLCanvasElement>(null)
  const inkRef = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<Pt[][]>([])
  const cur = useRef<Pt[] | null>(null)
  const lastSpeak = useRef(0)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [fontTick, setFontTick] = useState(0)

  // 文字数に あわせた 横長の 枠
  const ratio = Math.min(3.2, Math.max(1, char.length * 0.72))
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => {
      const W = el.clientWidth
      const H = el.clientHeight
      const w = Math.floor(Math.min(W, H * ratio))
      setSize({ w, h: Math.floor(w / ratio) })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ratio])

  useEffect(() => {
    let alive = true
    document.fonts
      .load(`600 100px ${CARD_FONT}`, char)
      .catch(() => {})
      .finally(() => alive && setFontTick((t) => t + 1))
    return () => {
      alive = false
    }
  }, [char])

  const drawInk = useCallback(() => {
    const c = inkRef.current
    if (!c || !size.w) return
    const ctx = c.getContext('2d')!
    const dpr = c.width / size.w
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = size.h * 0.05
    ctx.strokeStyle = '#f97316'
    for (const s of [...strokes.current, ...(cur.current ? [cur.current] : [])]) {
      ctx.beginPath()
      s.forEach((p, j) => (j ? ctx.lineTo(p.x * size.w, p.y * size.h) : ctx.moveTo(p.x * size.w, p.y * size.h)))
      if (s.length === 1) ctx.lineTo(s[0].x * size.w + 0.1, s[0].y * size.h)
      ctx.stroke()
    }
  }, [size])

  // うすい もじ
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1
    for (const c of [guideRef.current, inkRef.current]) {
      if (!c) continue
      c.width = Math.round(size.w * dpr)
      c.height = Math.round(size.h * dpr)
      c.style.width = `${size.w}px`
      c.style.height = `${size.h}px`
    }
    const g = guideRef.current
    if (g && size.w) {
      const ctx = g.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size.w, size.h)
      let fs = size.h * 0.74
      ctx.font = `600 ${fs}px ${CARD_FONT}`
      const tw = ctx.measureText(char).width
      if (tw > size.w * 0.9) fs *= (size.w * 0.9) / tw
      ctx.font = `600 ${fs}px ${CARD_FONT}`
      ctx.fillStyle = '#d6d3d1'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(char, size.w / 2, size.h / 2 + fs * 0.04)
    }
    drawInk()
  }, [size, char, fontTick, drawInk])

  useEffect(() => {
    strokes.current = []
    cur.current = null
    drawInk()
  }, [resetSignal, char, drawInk])

  const pt = (e: React.PointerEvent): Pt => {
    const r = (e.target as HTMLElement).getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }
  const onDown = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    cur.current = [pt(e)]
    drawInk()
  }
  const onMove = (e: React.PointerEvent) => {
    if (!cur.current) return
    cur.current.push(pt(e))
    drawInk()
  }
  const onUp = () => {
    if (!cur.current) return
    strokes.current.push(cur.current)
    cur.current = null
    drawInk()
    onComplete?.()
    const now = performance.now()
    if (now - lastSpeak.current > 1200) {
      lastSpeak.current = now
      window.setTimeout(() => speak(char), 400)
    }
  }

  return (
    <div className="flex h-full w-full flex-col items-center gap-2">
      <div ref={wrapRef} className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        <div className="no-touch-scroll relative overflow-hidden rounded-[28px] border-4 border-amber-200 bg-white shadow-[0_6px_0_#fde68a]" style={{ width: size.w, height: size.h }}>
          <canvas ref={guideRef} className="absolute inset-0" aria-hidden />
          <canvas
            ref={inkRef}
            className="no-touch-scroll absolute inset-0"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            aria-label={`「${char}」をなぞる`}
          />
        </div>
      </div>
    </div>
  )
}
