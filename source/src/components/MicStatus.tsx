import { useEffect, useRef, useState } from 'react'
import { CircleHelp, Mic, MicOff, RotateCcw } from 'lucide-react'
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
export function MicBadge({ status, frame, onRetry, error }: { status: MicStatus; frame: React.RefObject<FrameInfo | null>; onRetry?: () => void; error?: string }) {
  const [help, setHelp] = useState(false)
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
    status === 'listening' ? 'きいてるよ' : status === 'starting' ? 'じゅんびちゅう' : status === 'denied' ? 'マイクが つかえません' : status === 'unsupported' ? 'マイクが ありません' : status === 'error' ? 'マイクが うごきません' : 'マイク おやすみ'

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
      {(status === 'denied' || status === 'error' || status === 'unsupported') && (
        <>
          {onRetry && (
            <button type="button" onClick={onRetry} className="flex items-center gap-1 rounded-full border-2 border-amber-300 bg-white px-3 py-1.5 text-sm font-bold text-stone-700">
              <RotateCcw size={16} /> もういちど
            </button>
          )}
          <button type="button" onClick={() => setHelp(true)} className="flex items-center gap-1 text-sm text-stone-500 underline">
            <CircleHelp size={16} /> おうちのかたへ
          </button>
        </>
      )}
      {help && <MicHelp error={error} onClose={() => setHelp(false)} />}
    </div>
  )
}

/** マイクが使えないときの案内（保護者向け） */
function MicHelp({ error, onClose }: { error?: string; onClose: () => void }) {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  const app = /CriOS/.test(ua) ? 'Chrome' : /FxiOS/.test(ua) ? 'Firefox' : /EdgiOS/.test(ua) ? 'Edge' : 'Safari'
  const insecure = !window.isSecureContext
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 p-4" onClick={onClose}>
      <div className="flex w-full max-w-md flex-col gap-3 rounded-3xl bg-stone-50 p-6 text-left text-stone-700 shadow-xl" style={{ touchAction: 'pan-y' }} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-stone-800">マイクが使えないとき</h3>
        {insecure ? (
          <p className="text-sm leading-relaxed">このページは https で開いていないため、マイクが使えません。https:// から始まるアドレスで開いてください。</p>
        ) : ios ? (
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed">
            <li>iPhone/iPad の「設定」アプリ →「{app}」→「マイク」をオンにします。</li>
            <li>{app === 'Safari' ? 'Safari でこのページを開き、アドレスバーの「ぁあ」→「Webサイトの設定」→「マイク」を「許可」にします。' : `${app} でこのページを開きなおし、「マイクの使用を許可しますか？」と出たら「許可」を押します。`}</li>
            <li>ページを読みこみなおして、もう一度「マイクで よむ」/「スタート」を押します。</li>
          </ol>
        ) : (
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed">
            <li>アドレスバー左のアイコンを押し、「マイク」を「許可」にします。</li>
            <li>パソコンの設定で、ブラウザのマイク利用が許可されているか確かめます。</li>
            <li>ページを読みこみなおして、もう一度ためします。</li>
          </ol>
        )}
        <p className="text-xs text-stone-400">マイクが使えなくても「できた」ボタンで進めます。{error ? `（エラー：${error}）` : ''}</p>
        <button type="button" onClick={onClose} className="self-end rounded-full bg-amber-400 px-5 py-2 font-bold text-stone-900">とじる</button>
      </div>
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
