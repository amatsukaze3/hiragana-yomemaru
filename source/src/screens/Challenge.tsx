import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Hand, House, Mic, Play, Trophy } from 'lucide-react'
import { Card } from '../components/Card'
import { Confetti, Hanamaru, Modal } from '../components/Celebrate'
import { BandMeter, MicBadge } from '../components/MicStatus'
import { Mascot } from '../components/Mascot'
import { smartShuffle, type Kana, type Row } from '../data/kana'
import { playChime, sayVoice } from '../lib/audio'
import { lsGet, lsSet } from '../lib/storage'
import { useVoiceJudge } from '../lib/useVoiceJudge'
import type { PassSource } from '../lib/voice'
import { ActionButton } from './Learn'

const TOTAL = 10
const bestKey = (rowId: string) => (rowId === 'a' ? 'yomemaru:best' : `yomemaru:best:${rowId}`)

export function getBest(rowId: string): number | null {
  const v = Number(lsGet(bestKey(rowId)))
  return Number.isFinite(v) && v > 0 ? v : null
}

export function formatTime(ms: number) {
  const s = ms / 1000
  const m = Math.floor(s / 60)
  const rest = (s % 60).toFixed(1)
  return m > 0 ? `${m}ふん ${rest}びょう` : `${rest}びょう`
}

type Phase = 'ready' | 'playing' | 'finished'

export function Challenge({ row, onHome, meter }: { row: Row; onHome: () => void; meter: boolean }) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [questions, setQuestions] = useState<Kana[]>(() => smartShuffle(TOTAL, row.kana))
  const [idx, setIdx] = useState(0)
  const [burst, setBurst] = useState(0)
  const [flash, setFlash] = useState(0)
  const [result, setResult] = useState<{ time: number; best: number | null; record: boolean; manual: number } | null>(null)
  const startAt = useRef(0)
  const busy = useRef(false)
  const manualCount = useRef(0)
  const lastSource = useRef<PassSource | 'manual'>('formant')

  const target = phase === 'playing' ? questions[idx] : null

  const correct = (src: PassSource | 'manual') => {
    if (busy.current || phase !== 'playing') return
    busy.current = true
    lastSource.current = src
    if (src === 'manual') manualCount.current++
    playChime()
    voice.hold(900)
    setBurst((b) => b + 1)
    setFlash((f) => f + 1)
    if (idx + 1 >= TOTAL) {
      const time = performance.now() - startAt.current
      const prev = getBest(row.id)
      // マイクを使わずに「できた」で進めた回は、最高記録には入れない
      const counts = manualCount.current === 0
      const record = counts && (prev === null || time < prev)
      if (record) lsSet(bestKey(row.id), String(Math.round(time)))
      window.setTimeout(() => {
        setResult({ time, best: record ? time : prev, record, manual: manualCount.current })
        setPhase('finished')
        voice.stop()
        window.setTimeout(() => sayVoice('clear10'), 300)
        busy.current = false
      }, 650)
    } else {
      window.setTimeout(() => {
        setIdx((i) => i + 1)
        busy.current = false
      }, 650)
    }
  }

  const voice = useVoiceJudge(target, (src) => correct(src))

  const start = async () => {
    setQuestions(smartShuffle(TOTAL, row.kana, questions[TOTAL - 1]))
    setIdx(0)
    setResult(null)
    manualCount.current = 0
    busy.current = false
    await voice.start()
    startAt.current = performance.now()
    setPhase('playing')
  }

  const micOk = voice.status === 'listening'

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 px-3 pt-3 sm:px-5">
        <button type="button" onClick={onHome} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-amber-200 bg-white text-stone-600" aria-label="ホームへ">
          <House size={24} />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-xl font-bold text-stone-800 sm:text-2xl">② チャレンジ おんどく（{row.name}）</h2>
        {phase === 'playing' && <Stopwatch startAt={startAt.current} />}
      </header>

      {phase === 'ready' && (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
          <Mascot size={130} />
          <p className="text-2xl font-bold leading-relaxed text-stone-800">
            でてくる もじを
            <br />
            マイクに むかって よもう！
          </p>
          <p className="text-lg text-stone-500">ぜんぶで {TOTAL}もん。はやく よめるかな？</p>
          {getBest(row.id) && (
            <p className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-lg text-amber-800">
              <Trophy size={20} /> さいこう きろく {formatTime(getBest(row.id)!)}
            </p>
          )}
          <ActionButton icon={<Play />} label="スタート" onClick={() => void start()} strong />
          <p className="flex items-center gap-1 text-sm text-stone-400">
            <Mic size={14} /> はじめに マイクの きょかを きかれたら「きょか」を おしてね
          </p>
        </main>
      )}

      {phase === 'playing' && (
        <>
          <div className="flex justify-center gap-1.5 px-4 pt-3" aria-label={`${idx + 1} / ${TOTAL}`}>
            {questions.map((_, i) => (
              <span key={i} className={`h-3 w-6 rounded-full sm:w-8 ${i < idx ? 'bg-orange-400' : i === idx ? 'bg-amber-400' : 'bg-stone-200'}`} />
            ))}
          </div>
          <p className="pt-1 text-center text-lg text-stone-500">
            {idx + 1} / {TOTAL} もんめ
          </p>

          <main className="relative min-h-0 flex-1 px-4 py-3">
            <AnimatePresence mode="wait">
              <motion.div key={`${idx}-${questions[idx]}`} className="mx-auto h-full w-full max-w-2xl" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.08 }} transition={{ duration: 0.2 }}>
                <Card char={questions[idx]} variant="letter" />
              </motion.div>
            </AnimatePresence>
            <AnimatePresence>
              {flash > 0 && (
                <motion.p
                  key={flash}
                  className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center text-6xl font-bold text-orange-500 drop-shadow-[0_3px_0_#fff]"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.65, times: [0, 0.2, 0.7, 1] }}
                >
                  ピンポン♫
                </motion.p>
              )}
            </AnimatePresence>
          </main>

          <footer className="flex flex-wrap items-center justify-center gap-4 px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <MicBadge status={voice.status} frame={voice.frame} error={voice.lastError()} onRetry={() => void voice.start()} />
            {meter && micOk && <BandMeter frame={voice.frame} />}
            {!micOk && voice.status !== 'starting' && (
              <ActionButton icon={<Hand />} label="できた" onClick={() => correct('manual')} strong />
            )}
          </footer>
        </>
      )}

      <Confetti burst={burst} />

      <Modal open={phase === 'finished' && !!result}>
        {result && (
          <>
            <Hanamaru size={150} />
            <p className="text-3xl font-bold text-stone-800">{TOTAL}もん クリア！</p>
            <p className="text-5xl font-bold tabular-nums text-orange-500">{formatTime(result.time)}</p>
            {result.record ? (
              <p className="flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-xl font-bold text-orange-700">
                <Trophy size={22} /> あたらしい さいこう きろく！
              </p>
            ) : result.best ? (
              <p className="text-lg text-stone-500">さいこう きろく {formatTime(result.best)}</p>
            ) : null}
            {result.manual > 0 && <p className="text-sm text-stone-400">「できた」で すすんだ もんだいが あるので、きろくには のこりません</p>}
            <div className="flex flex-wrap justify-center gap-3">
              <ActionButton label="もういちど" onClick={() => void start()} strong />
              <ActionButton label="ホームへ" onClick={onHome} />
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

function Stopwatch({ startAt }: { startAt: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let raf = 0
    const loop = () => {
      if (ref.current) ref.current.textContent = ((performance.now() - startAt) / 1000).toFixed(1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [startAt])
  return (
    <span className="flex items-baseline gap-1 rounded-full bg-white px-4 py-1.5 text-stone-700 shadow-sm">
      <span ref={ref} className="text-2xl font-bold tabular-nums">
        0.0
      </span>
      <span className="text-sm">びょう</span>
    </span>
  )
}
