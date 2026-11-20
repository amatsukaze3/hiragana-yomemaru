import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Mic, RotateCcw, X } from 'lucide-react'
import { Card } from './Card'
import { MicBadge } from './MicStatus'
import { Mascot } from './Mascot'
import { playChime, sayVoice, speak } from '../lib/audio'
import { useVoiceJudge } from '../lib/useVoiceJudge'
import type { Kana } from '../data/kana'

/** とうろくする音：ア・イ・ウ・エ・オ と、聞きとりにくい「ン」（判定エンジンの あいうえお・ん の じゅん） */
const REG: Kana[] = ['あ', 'い', 'う', 'え', 'お', 'ん']
const LASTSTEP = REG.length
import { saveVoiceprint } from '../lib/voiceprint'

/**
 * こえの とうろく：その子の「ア・イ・ウ・エ・オ・ン」を1回ずつ録って、この端末に保存する。
 * 以後の判定は、この声とくらべて行う（子どもの声のちがいに強くなる）。
 */
export function VoiceRegister({ name, onDone, onCancel }: { name?: string; onDone: () => void; onCancel: () => void }) {
  const voice = useVoiceJudge(null, () => {})
  const [step, setStep] = useState(-1) // -1: はじめる前、0〜5: ア〜オ・ン、6: おわり
  const [waiting, setWaiting] = useState(false)
  const [slow, setSlow] = useState(false)
  const slowTimer = useRef(0)
  const shapes = useRef<(number[] | null)[]>(REG.map(() => null))
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
    speak(REG[i], {
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
          if (i + 1 < REG.length) window.setTimeout(() => alive.current && ask(i + 1), 700)
          else finish()
        }, 350, REG[i] === 'ん' ? 3 : 5) // 「ン」は 小さな音なので すこし ゆるく
      },
    })
  }

  const finish = () => {
    setStep(LASTSTEP)
    setWaiting(false)
    voice.stop()
    const s = shapes.current as number[][]
    saveVoiceprint({ date: new Date().toISOString(), name, C: s.slice(0, 5), N: s[5] })
    window.setTimeout(() => alive.current && onDone(), 1200)
  }

  const begin = async () => {
    shapes.current = REG.map(() => null)
    await voice.start({ forRegister: true })
    setStep(0)
    // 「Listen to me,そっくり まねしてね。」と 言ってから はじめる
    let went = false
    const go = () => {
      if (went || !alive.current) return
      went = true
      ask(0)
    }
    sayVoice('reg_guide', go)
    window.setTimeout(go, 4500)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 pt-[env(safe-area-inset-top)]">
      <header className="flex items-center gap-3 px-3 pt-3 sm:px-5">
        <button type="button" onClick={onCancel} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-amber-200 bg-white text-stone-600" aria-label="Cancel">
          <X size={24} />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-xl font-bold text-stone-800 sm:text-2xl">My voice</h2>
        <div className="flex gap-1.5">
          {REG.map((v, i) => (
            <span key={v} className={`font-card flex h-9 w-9 items-center justify-center rounded-full text-lg ${i < step || step === LASTSTEP ? 'bg-pink-400 text-white' : i === step ? 'bg-amber-300 text-stone-900' : 'bg-stone-200 text-stone-500'}`}>
              {v}
            </span>
          ))}
        </div>
      </header>

      {step === -1 && (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
          <Mascot size={120} />
          <p className="text-2xl font-bold leading-relaxed text-stone-800">
            Listen to me,
            <br />
            then say it just like me!
          </p>
          <p className="text-base leading-relaxed text-stone-500">
            Daisy says <span className="font-card">あ・い・う・え・お・ん</span> one at a time. Say each one after her.
            <br />
            (For parents & teachers: only numbers describing the voice are saved on this device — no recordings, and nothing is sent anywhere. 保存するのは声の特徴の数値だけで、声そのものは保存せず、端末の外にも送られません)
          </p>
          <button type="button" onClick={() => void begin()} className="flex items-center gap-2 rounded-full bg-pink-500 px-8 py-4 text-2xl font-bold text-white shadow-[0_5px_0_#be185d] active:translate-y-1 active:shadow-none">
            <Mic size={28} /> Start
          </button>
        </main>
      )}

      {step >= 0 && step < LASTSTEP && (
        <>
          <main className="relative min-h-0 flex-1 px-4 py-3">
            <motion.div key={step} className="mx-auto h-full w-full max-w-2xl" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18 }}>
              <Card char={REG[step]} variant="letter" />
            </motion.div>
          </main>
          <footer className="flex flex-wrap items-center justify-center gap-4 px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <div className="flex flex-col items-center">
              <p className="text-2xl font-bold text-pink-600">{waiting ? <>Now you say <span className="font-card">「{REG[step]}」</span></> : 'Listen…'}</p>
              {slow && <p className="text-base text-stone-500">Move closer to the mic (you don't need to be loud)</p>}
            </div>
            <MicBadge status={voice.status} frame={voice.frame} error={voice.lastError()} onRetry={() => void begin()} />
            <button type="button" onClick={() => ask(step)} className="flex h-12 items-center gap-1 rounded-full border-2 border-stone-300 bg-white px-4 text-base font-bold text-stone-600">
              <RotateCcw size={18} /> Again
            </button>
          </footer>
        </>
      )}

      {step === LASTSTEP && (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <Mascot size={120} mood="cheer" />
          <p className="text-3xl font-bold text-pink-500">Done! Daisy knows your voice.</p>
        </main>
      )}
    </div>
  )
}
