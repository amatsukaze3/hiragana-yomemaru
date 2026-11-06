import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Mic, RotateCcw, X } from 'lucide-react'
import { Card } from './Card'
import { MicBadge } from './MicStatus'
import { Mascot } from './Mascot'
import { playChime, speak } from '../lib/audio'
import { useVoiceJudge } from '../lib/useVoiceJudge'
import { VOWEL_ORDER } from '../lib/vowelClassifier'
import { saveVoiceprint } from '../lib/voiceprint'

/**
 * こえの とうろく：その子の「あ・い・う・え・お」を1回ずつ録って、この端末に保存する。
 * 以後の判定は、この声とくらべて行う（子どもの声のちがいに強くなる）。
 */
export function VoiceRegister({ name, onDone, onCancel }: { name?: string; onDone: () => void; onCancel: () => void }) {
  const voice = useVoiceJudge(null, () => {})
  const [step, setStep] = useState(-1) // -1: はじめる前、0〜4: あ〜お、5: おわり
  const [waiting, setWaiting] = useState(false)
  const [slow, setSlow] = useState(false)
  const slowTimer = useRef(0)
  const shapes = useRef<(number[] | null)[]>([null, null, null, null, null])
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      voice.cancelCapture()
      voice.stop()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const ask = (i: number) => {
    setStep(i)
    setWaiting(false)
    setSlow(false)
    window.clearTimeout(slowTimer.current)
    voice.cancelCapture()
    // お手本を聞いてから、その子の声を1回とる
    speak(VOWEL_ORDER[i], {
      onEnd: () => {
        if (!alive.current) return
        setWaiting(true)
        // しばらく聞きとれないときは、マイクに近づくよう 声をかける
        slowTimer.current = window.setTimeout(() => alive.current && setSlow(true), 5000)
        voice.capture((shape) => {
          if (!alive.current) return
          if (!shape) {
            ask(i) // 短すぎたときは もういちど
            return
          }
          window.clearTimeout(slowTimer.current)
          setSlow(false)
          shapes.current[i] = shape
          playChime()
          if (i + 1 < 5) window.setTimeout(() => alive.current && ask(i + 1), 700)
          else finish()
        }, 350)
      },
    })
  }

  const finish = () => {
    setStep(5)
    setWaiting(false)
    voice.stop()
    saveVoiceprint({ date: new Date().toISOString(), name, C: shapes.current as number[][] })
    window.setTimeout(() => alive.current && onDone(), 1200)
  }

  const begin = async () => {
    shapes.current = [null, null, null, null, null]
    await voice.start({ forRegister: true })
    ask(0)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 pt-[env(safe-area-inset-top)]">
      <header className="flex items-center gap-3 px-3 pt-3 sm:px-5">
        <button type="button" onClick={onCancel} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-amber-200 bg-white text-stone-600" aria-label="やめる">
          <X size={24} />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-xl font-bold text-stone-800 sm:text-2xl">こえの とうろく</h2>
        <div className="flex gap-1.5">
          {VOWEL_ORDER.map((v, i) => (
            <span key={v} className={`font-card flex h-9 w-9 items-center justify-center rounded-full text-lg ${i < step || step === 5 ? 'bg-orange-400 text-white' : i === step ? 'bg-amber-300 text-stone-900' : 'bg-stone-200 text-stone-500'}`}>
              {v}
            </span>
          ))}
        </div>
      </header>

      {step === -1 && (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
          <Mascot size={120} />
          <p className="text-2xl font-bold leading-relaxed text-stone-800">
            「あ・い・う・え・お」を
            <br />
            ひとつずつ よんでね
          </p>
          <p className="text-base leading-relaxed text-stone-500">
            ずんだもんの おてほんの あとに、いつもの こえで 1かいずつ よみます。
            <br />
            （おうちのかた・先生へ：その子の声を おぼえて、判定を その子に あわせます。保存するのは 声の特徴の数値だけで、声そのものは 保存しません。この端末の外にも おくられません）
          </p>
          <button type="button" onClick={() => void begin()} className="flex items-center gap-2 rounded-full bg-orange-500 px-8 py-4 text-2xl font-bold text-white shadow-[0_5px_0_#c2410c] active:translate-y-1 active:shadow-none">
            <Mic size={28} /> はじめる
          </button>
        </main>
      )}

      {step >= 0 && step < 5 && (
        <>
          <main className="relative min-h-0 flex-1 px-4 py-3">
            <motion.div key={step} className="mx-auto h-full w-full max-w-2xl" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18 }}>
              <Card char={VOWEL_ORDER[step]} variant="letter" />
            </motion.div>
          </main>
          <footer className="flex flex-wrap items-center justify-center gap-4 px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <div className="flex flex-col items-center">
              <p className="text-2xl font-bold text-orange-600">{waiting ? `「${VOWEL_ORDER[step]}」と よんでね` : 'きいてね…'}</p>
              {slow && <p className="text-base text-stone-500">マイクに ちかづいて よんでね（おおきな こえで なくて だいじょうぶ）</p>}
            </div>
            <MicBadge status={voice.status} frame={voice.frame} error={voice.lastError()} onRetry={() => void begin()} />
            <button type="button" onClick={() => ask(step)} className="flex h-12 items-center gap-1 rounded-full border-2 border-stone-300 bg-white px-4 text-base font-bold text-stone-600">
              <RotateCcw size={18} /> もういちど
            </button>
          </footer>
        </>
      )}

      {step === 5 && (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <Mascot size={120} mood="cheer" />
          <p className="text-3xl font-bold text-orange-500">とうろく できたよ！</p>
        </main>
      )}
    </div>
  )
}
