import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Eraser, House, Mic, Volume2 } from 'lucide-react'
import { Card } from '../components/Card'
import { Confetti, Hanamaru, Modal } from '../components/Celebrate'
import { MicBadge } from '../components/MicStatus'
import { Mascot } from '../components/Mascot'
import { TraceCanvas } from '../components/TraceCanvas'
import { KANA_INFO, smartShuffle, type Kana, type Row } from '../data/kana'
import { playChime, sayVoice, speak } from '../lib/audio'
import { useVoiceJudge } from '../lib/useVoiceJudge'
import type { MissInfo } from '../lib/voice'
import { markMastered } from '../lib/progress'
import { TeacherHelp } from '../components/TeacherHelp'
import { useRetryRegister } from '../components/RetryPrompt'
import { sayWord } from '../shooting/voices'

const STEPS = [
  { title: 'Picture & letter', guide: 'Look and listen. Tap the card to hear it again.' },
  { title: 'Trace', guide: 'Trace the strokes in order, starting from ①.' },
  { title: 'Letter only', guide: 'Look at the letter and listen.' },
  { title: 'Read it yourself', guide: 'Read it out loud. Tap “Answer” to check.' },
  { title: 'Mixed up', guide: 'Read each letter you see.' },
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
  // ステップ1は もじの あとに 絵の ことば（「あ … あいす」）も よむ（英語圏の子が 絵と ことばを むすびつけられるように）
  useEffect(() => {
    setAnswered(false)
    if (step === 0 || step === 2) {
      let alive = true
      let t2 = 0
      const t = window.setTimeout(() => speak(char, { onEnd: () => { if (alive && step === 0) t2 = window.setTimeout(() => alive && sayWord(char), 250) } }), 350)
      return () => {
        alive = false
        window.clearTimeout(t)
        window.clearTimeout(t2)
      }
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
  const passOne = (byVoice = false) => {
    if (busy.current) return
    busy.current = true
    // マイクで読めた文字を「よめたよ バー」に きろくする（「できた」ボタンでは きろくしない）
    if (byVoice) markMastered(char)
    retry.reset()
    playChime()
    voice.hold(900)
    setBurst((b) => b + 1)
    window.setTimeout(() => {
      busy.current = false
      advance5()
    }, 700)
  }
  const retry = useRetryRegister()
  // ステップ5：おなじ 文字で 2かい よんでも とおらなかったら、よみかたを きかせる（ヒント。そのあと まねして よめば 合格）
  const misses = useRef(0)
  useEffect(() => {
    misses.current = 0
  }, [voiceTarget, idx])
  const onMiss5 = (info?: MissInfo) => {
    misses.current += 1
    if (misses.current === 2 && voiceTarget) {
      voice.hold(1100)
      window.setTimeout(() => speak(voiceTarget), 150)
    }
    retry.onMiss(info)
  }
  const voice = useVoiceJudge(voiceTarget, () => passOne(true), idx, onMiss5)
  retry.bind(voice)

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
        <button type="button" onClick={onHome} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-amber-200 bg-white text-stone-600" aria-label="Home">
          <House size={24} />
        </button>
        <span className="font-card shrink-0 rounded-full bg-amber-100 px-3 py-1.5 text-lg text-amber-900">{row.name}</span>
        <ol className="grid min-w-0 flex-1 grid-cols-5 gap-1.5">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button type="button" onClick={() => goStep(i)} className="flex w-full flex-col items-stretch gap-1" aria-current={i === step ? 'step' : undefined}>
                <span className={`h-3 rounded-full ${i < step ? 'bg-pink-400' : i === step ? 'bg-amber-400' : 'bg-stone-200'}`} />
                <span className={`truncate text-center text-xs sm:text-sm ${i === step ? 'font-bold text-stone-800' : 'text-stone-400'}`}>Step {i + 1}</span>
              </button>
            </li>
          ))}
        </ol>
        {/* せんせい ヘルプ：一時停止・強制合格（ステップ5で 合格にできる） */}
        <TeacherHelp onPause={voice.pause} onResume={voice.resume} onPass={step === 4 && !hanamaru ? () => passOne(true) : undefined} onHome={onHome} />
      </header>

      <div className="flex flex-col items-center gap-1 px-4 pt-3 text-center">
        <h2 className="text-2xl font-bold text-stone-800 sm:text-3xl">
          <span className="text-pink-500">Step {step + 1}</span>&nbsp;&nbsp;{STEPS[step].title}
        </h2>
        <p className="text-base text-stone-500 sm:text-lg">{STEPS[step].guide}</p>
        <div className="mt-1 flex gap-2" aria-label={`${idx + 1} / ${N}`}>
          {Array.from({ length: N }, (_, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < idx ? 'bg-pink-400' : i === idx ? 'bg-amber-500 ring-4 ring-amber-200' : 'bg-stone-200'}`} />
          ))}
        </div>
      </div>

      {/* まんなか：カード */}
      <main className="min-h-0 flex-1 px-4 py-4">
        {/* 前のカードが 消えるのを 待たずに 次を出す（待つと 止まることがあるため） */}
        <motion.div key={`${step}-${idx}-${char}`} className="mx-auto h-full w-full max-w-3xl" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22 }}>
            {step === 0 && <Card char={char} variant="picture" onTap={() => speak(char, { onEnd: () => window.setTimeout(() => sayWord(char), 250) })} />}
            {step === 1 && <TraceCanvas char={char} resetSignal={traceReset} />}
            {step === 2 && <Card char={char} variant="letter" onTap={() => speak(char)} />}
            {step === 3 && <Card char={char} variant="letter" />}
            {step === 4 && <Card char={char} variant="letter" />}
        </motion.div>
      </main>

      {/* 下：操作 */}
      <footer className="flex items-center justify-between gap-3 px-3 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-6">
        <NavButton dir="prev" onClick={prev} disabled={step === 0 && idx === 0} />

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-3">
          {step === 0 && <ActionButton icon={<Volume2 />} label="Listen" onClick={() => speak(char, { onEnd: () => window.setTimeout(() => sayWord(char), 250) })} />}
          {step === 1 && <ActionButton icon={<Eraser />} label="Again" onClick={() => setTraceReset((r) => r + 1)} />}
          {step === 2 && <ActionButton icon={<Volume2 />} label="Listen" onClick={() => speak(char)} />}
          {step === 3 && (
            <ActionButton
              icon={<Volume2 />}
              label={answered ? `「${char}」` : 'Answer'}
              onClick={() => {
                setAnswered(true)
                speak(char)
              }}
            />
          )}
          {step === 4 && (
            <>
              {voice.status === 'idle' ? (
                <ActionButton icon={<Mic />} label="Read with mic" onClick={() => void voice.start()} />
              ) : (
                <MicBadge status={voice.status} frame={voice.frame} error={voice.lastError()} onRetry={() => void voice.start()} heard={voice.heard} canHear={voice.canHear} />
              )}
              <ActionButton label="I did it" onClick={() => passOne(false)} strong />
            </>
          )}
        </div>

        {step < 4 ? <NavButton dir="next" onClick={next} /> : <span className="w-[104px]" />}
      </footer>

      <span className="sr-only" aria-live="polite">{info.word}</span>
      <Confetti burst={burst} />
      {retry.element}

      <Modal open={hanamaru}>
        <Hanamaru />
        <p className="text-3xl font-bold text-stone-800">You passed!</p>
        <p className="text-lg text-stone-600">You can read <span className="font-card">{row.kana.join('・')}</span></p>
        <Mascot size={90} mood="cheer" />
        <div className="flex flex-wrap justify-center gap-3">
          <ActionButton label="Again" onClick={restart5} />
          <ActionButton label="Home" onClick={onHome} strong />
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
      {dir === 'prev' ? 'Back' : 'Next'}
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
        strong ? 'bg-pink-500 text-white shadow-[0_5px_0_#be185d]' : 'border-2 border-amber-300 bg-white text-stone-700 shadow-[0_4px_0_#fde68a]'
      }`}
    >
      {icon}
      {label}
    </motion.button>
  )
}
