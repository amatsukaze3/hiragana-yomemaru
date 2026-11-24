import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { drawFourLines, layoutRomaji, loadRomaFont } from '../lib/fourLines'

/** Andika が よみこまれたら かきなおす（なぞり書き・カードで つかう） */
export function useRomaFontTick(text: string) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    void loadRomaFont(text).then(() => alive && setTick((t) => t + 1))
    const onDone = () => setTick((t) => t + 1)
    document.fonts.addEventListener?.('loadingdone', onDone)
    return () => {
      alive = false
      document.fonts.removeEventListener?.('loadingdone', onDone)
    }
  }, [text])
  return tick
}

/** 4本線の 上に ローマ字を かく（カードの「もじ だけ」） */
export function RomajiBoard({ text, sub, color = '#1c1917' }: { text: string; sub?: string | null; color?: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const tick = useRomaFontTick(text + (sub ?? ''))

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const c = cv.current
    if (!c || !size.w || !size.h) return
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    c.width = Math.round(size.w * dpr)
    c.height = Math.round(size.h * dpr)
    c.style.width = `${size.w}px`
    c.style.height = `${size.h}px`
    const g = c.getContext('2d')!
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, size.w, size.h)
    const H = sub ? size.h * 0.82 : size.h
    const L = layoutRomaji(text, size.w, H)
    drawFourLines(g, L, size.w)
    g.font = L.font
    g.fillStyle = color
    g.textBaseline = 'alphabetic'
    g.textAlign = 'left'
    g.fillText(text, L.x, L.baseline)
    if (sub) {
      // 訓令式を 小さく そえる
      g.font = L.font.replace(/[\d.]+px/, `${Math.round(L.fontSize * 0.32)}px`)
      g.fillStyle = '#78716c'
      g.textAlign = 'center'
      g.fillText(`（${sub}）`, size.w / 2, size.h * 0.93)
    }
  }, [size, text, sub, color, tick])

  return (
    <div ref={wrap} className="pointer-events-none absolute inset-0">
      <canvas ref={cv} className="absolute inset-0" aria-hidden />
    </div>
  )
}
