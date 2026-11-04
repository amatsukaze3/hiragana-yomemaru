import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Eraser, House, Mic, Volume2 } from 'lucide-react'
import { Card } from '../components/Card'
import { Confetti, Hanamaru, Modal } from '../components/Celebrate'
import { MicBadge } from '../components/MicStatus'
import { Mascot } from '../components/Mascot'
import { TraceCanvas } from '../components/TraceCanvas'
import { KANA_INFO, smartShuffle, type Kana, type Row } from '../data/kana'
import { playChime, sayVoice, speak } from '../lib/audio'
import { useVoiceJudge } from '../lib/useVoiceJudge'

const STEPS = [
  { title: 'え と もじ', guide: 'えを みて、きいてみよう。カードを おすと もういちど きけるよ' },
  { title: 'なぞりよみ', guide: '① から じゅんばんに なぞってね' },
  { title: 'もじ だけ', guide: 'もじを みて、きいてみよう' },
  { title: 'じぶんで よむ', guide: 'こえに だして よんでみよう。「こたえ」で たしかめられるよ' },
  { title: 'ばらばらに よむ', guide: 'でてきた もじを よんでみよう' },
]

export function Learn({ row, onHome }: { row: Row; onHome: () => void }) {
  const N = row.kana.length
  const LAST = N - 1
  const [step, setStep] = useState(0)
  const [idx, setIdx] = useState(0)
  const [traceReset, setTraceReset] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [order, setOrder] = useState<Kana[]>(() => smartShuffle(N, row.kana, row.kana[LAST]))
  const [burst, setBurst] = useState(0)
  const [hanamaru, setHanamaru] = useState(false)

  const char: Kana = step === 4 ? order[Math.min(idx, LAST)] : row.kana[Math.min(idx, LAST)]
  const info = KANA_INFO[char]

  // ステップ1・3：表示したら自動で読み上げる（ステップ4は鳴らさない）
  useEffect(() => {
    setAnswered(false)
    if (step === 0 || step === 2) {
      const t = window.setTimeout(() => speak(char), 350)
      return () => window.clearTimeout(t)
    }
  }, [step, idx, char])

  const voiceTarget = step === 4 && !hanamaru ? char : null

  const advance5 = useCallback(() => {
    if (idx >= LAST) {
      setHanamaru(true)
      window.setTimeout(() => sayVoice('pass5'), 500)
    } else {
      setIdx((i) => i + 1)
    }
  }, [idx, LAST])

  const busy = useRef(false)
  const passOne = () => {
    if (busy.current) return
    busy.current = true
    playChime()
    voice.hold(900)
    setBurst((b) => b + 1)
    window.setTimeout(() => {
      busy.current = false
      advance5()
    }, 700)
  }
  const voice = useVoiceJudge(voiceTarget, passOne)

  // ステップ5を出たらマイクを止める
  useEffect(() => {
    if (step !== 4) voice.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const goStep = (s: number, i = 0) => {
    setStep(s)
    setIdx(i)
    setTraceReset((r) => r + 1)
    if (s === 4) setOrder(smartShuffle(N, row.kana, row.kana[LAST]))
  }

  const next = () => {
    if (step < 4 && idx < LAST) setIdx(idx + 1)
    else if (step < 4) goStep(step + 1)
  }
  const prev = () => {
    if (step === 4) goStep(3, LAST)
    else if (idx > 0) setIdx(idx - 1)
    else if (step > 0) goStep(step - 1, LAST)
  }

  const restart5 = () => {
    setHanamaru(false)
    setOrder(smartShuffle(N, row.kana, order[LAST]))
    setIdx(0)
  }

  return (
    <div className="flex h-full flex-col">
      {/* 上：ステップのプログレスバー */}
      <header className="flex items-center gap-3 px-3 pt-3 sm:px-5">
        <button type="button" onClick={onHome} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-amber-200 bg-white text-stone-600" aria-label="ホームへ">
          <House size={24} />
        </button>
        <span className="font-card shrink-0 rounded-full bg-amber-100 px-3 py-1.5 text-lg text-amber-900">{row.name}</span>
        <ol className="grid min-w-0 flex-1 grid-cols-5 gap-1.5">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button type="button" onClick={() => goStep(i)} className="flex w-full flex-col items-stretch gap-1" aria-current={i === step ? 'step' : undefined}>
                <span className={`h-3 rounded-full ${i < step ? 'bg-orange-400' : i === step ? 'bg-amber-400' : 'bg-stone-200'}`} />
                <span className={`truncate text-center text-xs sm:text-sm ${i === step ? 'font-bold text-stone-800' : 'text-stone-400'}`}>ステップ{i + 1}</span>
              </button>
            </li>
          ))}
        </ol>
      </header>

      <div className="flex flex-col items-center gap-1 px-4 pt-3 text-center">
        <h2 className="text-2xl font-bold text-stone-800 sm:text-3xl">
          <span className="text-orange-500">ステップ{step + 1}</span>　{STEPS[step].title}
        </h2>
        <p className="text-base text-stone-500 sm:text-lg">{STEPS[step].guide}</p>
        <div className="mt-1 flex gap-2" aria-label={`${idx + 1} / ${N}`}>
          {Array.from({ length: N }, (_, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < idx ? 'bg-orange-400' : i === idx ? 'bg-amber-500 ring-4 ring-amber-200' : 'bg-stone-200'}`} />
          ))}
        </div>
      </div>

      {/* まんなか：カード */}
      <main className="min-h-0 flex-1 px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${step}-${idx}-${char}`}
            className="mx-auto h-full w-full max-w-3xl"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.22 }}
          >
            {step === 0 && <Card char={char} variant="picture" onTap={() => speak(char)} />}
            {step === 1 && <TraceCanvas char={char} resetSignal={traceReset} />}
            {step === 2 && <Card char={char} variant="letter" onTap={() => speak(char)} />}
            {step === 3 && <Card char={char} variant="letter" />}
            {step === 4 && <Card char={char} variant="letter" />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 下：操作 */}
      <footer className="flex items-center justify-between gap-3 px-3 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-6">
        <NavButton dir="prev" onClick={prev} disabled={step === 0 && idx === 0} />

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-3">
          {step === 0 && <ActionButton icon={<Volume2 />} label="きく" onClick={() => speak(char)} />}
          {step === 1 && <ActionButton icon={<Eraser />} label="もういちど" onClick={() => setTraceReset((r) => r + 1)} />}
          {step === 2 && <ActionButton icon={<Volume2 />} label="きく" onClick={() => speak(char)} />}
          {step === 3 && (
            <ActionButton
              icon={<Volume2 />}
              label={answered ? `「${char}」` : 'こたえ'}
              onClick={() => {
                setAnswered(true)
                speak(char)
              }}
            />
          )}
          {step === 4 && (
            <>
              {voice.status === 'idle' ? (
                <ActionButton icon={<Mic />} label="マイクで よむ" onClick={() => void voice.start()} />
              ) : (
                <MicBadge status={voice.status} frame={voice.frame} error={voice.lastError()} onRetry={() => void voice.start()} />
              )}
              <ActionButton label="できた" onClick={passOne} strong />
            </>
          )}
        </div>

        {step < 4 ? <NavButton dir="next" onClick={next} /> : <span className="w-[104px]" />}
      </footer>

      <span className="sr-only" aria-live="polite">{info.word}</span>
      <Confetti burst={burst} />

      <Modal open={hanamaru}>
        <Hanamaru />
        <p className="text-3xl font-bold text-stone-800">ごうかく！</p>
        <p className="text-lg text-stone-600">{row.kana.join('・')} が よめたね</p>
        <Mascot size={90} mood="cheer" />
        <div className="flex flex-wrap justify-center gap-3">
          <ActionButton label="もういちど" onClick={restart5} />
          <ActionButton label="ホームへ" onClick={onHome} strong />
        </div>
      </Modal>
    </div>
  )
}

function NavButton({ dir, onClick, disabled }: { dir: 'prev' | 'next'; onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.94 }}
      className={`flex h-16 w-[104px] shrink-0 items-center justify-center gap-1 rounded-full text-xl font-bold disabled:opacity-30 ${
        dir === 'next' ? 'bg-amber-400 text-stone-900 shadow-[0_5px_0_#d97706]' : 'border-2 border-amber-200 bg-white text-stone-600'
      }`}
    >
      {dir === 'prev' && <ChevronLeft size={26} />}
      {dir === 'prev' ? 'まえへ' : 'つぎへ'}
      {dir === 'next' && <ChevronRight size={26} />}
    </motion.button>
  )
}

export function ActionButton({ icon, label, onClick, strong }: { icon?: React.ReactNode; label: string; onClick: () => void; strong?: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      className={`flex h-16 items-center gap-2 rounded-full px-6 text-xl font-bold ${
        strong ? 'bg-orange-500 text-white shadow-[0_5px_0_#c2410c]' : 'border-2 border-amber-300 bg-white text-stone-700 shadow-[0_4px_0_#fde68a]'
      }`}
    >
      {icon}
      {label}
    </motion.button>
  )
}
