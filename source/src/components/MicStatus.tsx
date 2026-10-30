import { useEffect, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { motion } from 'motion/react'
import type { FrameInfo, MicStatus } from '../lib/voice'

const LABELS: Record<keyof FrameInfo['bands'], string> = {
  low: 'Low',
  midLow: 'F1',
  midHigh: 'F2',
  highF2: 'え',
  vHigh: 'い',
}

/** マイクの状態と、声の大きさの目安 */
export function MicBadge({ status, frame }: { status: MicStatus; frame: React.RefObject<FrameInfo | null> }) {
  const ring = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const f = frame.current
      if (ring.current) {
        const v = f?.voiced ? 1 : 0
        ring.current.style.transform = `scale(${1 + v * 0.35 + (f?.streak ?? 0) * 0.08})`
        ring.current.style.opacity = f?.voiced ? '0.55' : '0.15'
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [frame])

  const listening = status === 'listening'
  const text =
    status === 'listening' ? 'きいてるよ' : status === 'starting' ? 'じゅんびちゅう' : status === 'denied' ? 'マイクが つかえません' : status === 'unsupported' ? 'マイクが ありません' : 'マイク おやすみ'

  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-14 w-14 items-center justify-center">
        <span ref={ring} className="absolute inset-0 rounded-full bg-orange-300 transition-transform duration-75" />
        <motion.span
          className={`relative flex h-12 w-12 items-center justify-center rounded-full ${listening ? 'bg-orange-500 text-white' : 'bg-stone-200 text-stone-500'}`}
        >
          {listening ? <Mic size={26} /> : <MicOff size={26} />}
        </motion.span>
      </span>
      <span className="text-lg text-stone-600">{text}</span>
    </div>
  )
}

/** 保護者向け：5つの帯域のレベルメーター */
export function BandMeter({ frame }: { frame: React.RefObject<FrameInfo | null> }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([])
  useEffect(() => {
    let raf = 0
    const keys = Object.keys(LABELS) as (keyof FrameInfo['bands'])[]
    const loop = () => {
      const f = frame.current
      keys.forEach((k, i) => {
        const el = bars.current[i]
        if (el) {
          el.style.height = `${((f?.bands[k] ?? 0) / 255) * 100}%`
          el.style.background = f?.match ? '#f97316' : '#fcd34d'
        }
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [frame])
  return (
    <div className="flex items-end gap-1.5 rounded-xl border-2 border-amber-100 bg-white px-3 pb-1 pt-2" aria-hidden>
      {Object.values(LABELS).map((l, i) => (
        <div key={l} className="flex flex-col items-center gap-0.5">
          <div className="flex h-10 w-4 items-end overflow-hidden rounded bg-stone-100">
            <span ref={(el) => void (bars.current[i] = el)} className="block w-full rounded" />
          </div>
          <span className="text-[10px] text-stone-400">{l}</span>
        </div>
      ))}
    </div>
  )
}
