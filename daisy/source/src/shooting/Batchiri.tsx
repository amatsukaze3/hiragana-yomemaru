import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, Eraser, House, Play, RotateCcw, Volume2 } from 'lucide-react'
import { Card } from '../components/Card'
import { Confetti, Hanamaru } from '../components/Celebrate'
import { MicBadge } from '../components/MicStatus'
import { Mascot } from '../components/Mascot'
import { useRetryRegister } from '../components/RetryPrompt'
import { TeacherHelp } from '../components/TeacherHelp'
import { TraceCanvas } from '../components/TraceCanvas'
import { KANA_INFO, type Kana } from '../data/kana'
import { playChime } from '../lib/audio'
import { useVoiceJudge } from '../lib/useVoiceJudge'
import { ActionButton } from '../screens/Learn'
import { BossBattle } from './BossBattle'
import { jamaKey, type BossState } from './jama'
import { playDefeat, playSuperBeam } from './bossSfx'
import { playFanfare } from './fanfare'
import { GoldMedal } from './GoldMedal'
import { logCleared, logCorrect, logError, onceper, type WeakPick } from '../lib/errorLog'
import { makeTestOrder } from './testOrder'
import { sayBt, sayJama, sayKana, type BtLine } from './voices'

/**
 * これで ばっちり モード！
 * シューティングの きろくから にがてな もじを 3つ えらんで、
 * イラスト よみ → なぞり よみ → おいかけ よみ → マイク テスト で れんしゅう。
 * さいごに カンペキテスト（3もじ × 3かい = 9もん）が ぜんぶ よめたら おおきな はなまる と はくしゅ。
 */

const STEPS: { title: string; guide: string; line: BtLine }[] = [
  { title: 'Picture', guide: 'Look, listen, and read', line: 's1' },
  { title: 'Trace', guide: 'Trace from ① and read', line: 's2' },
  { title: 'Repeat', guide: 'Say it after Daisy', line: 's3' },
  { title: 'Mic test', guide: 'Read it out loud by yourself', line: 's4' },
]
const TEST_STEP = STEPS.length // 4 = カンペキテスト
const TEST_N = 9

type Phase = 'intro' | 'learn' | 'perfect'

export function Batchiri({ pick, onExit }: { pick: WeakPick; onExit: () => void }) {
  const kana = pick.kana
  const [phase, setPhase] = useState<Phase>('intro')
  const [step, setStep] = useState(0)
  const [idx, setIdx] = useState(0)
  const [testOrder, setTestOrder] = useState<Kana[]>(() => makeTestOrder(kana))
  /** デイジーちゃんが しゃべりおわって、マイクで きく じゅんびが できたか */
  const [ready, setReady] = useState(false)
  const [traceDone, setTraceDone] = useState(false)
  const [traceReset, setTraceReset] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [burst, setBurst] = useState(0)
  const busy = useRef(false)
  /** カンペキテスト（じゃままるくんとの ボスバトル）の じょうたい */
  const [boss, setBoss] = useState<BossState>('enter')
  const [hitKey, setHitKey] = useState(0)
  /** なかなか よめない（じゃままるくんが「どうした〜？」） */
  const [slow, setSlow] = useState(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const [narrow] = useState(() => window.innerWidth < 560)

  const isTest = step === TEST_STEP
  const count = isTest ? TEST_N : kana.length
  const char: Kana = isTest ? testOrder[Math.min(idx, TEST_N - 1)] : kana[Math.min(idx, kana.length - 1)]
  const micStep = step >= 2 // おいかけ よみ・マイク テスト・カンペキテスト は マイクで はんてい

  // はじめの あいさつ
  useEffect(() => {
    const t = window.setTimeout(() => sayBt('intro'), 300)
    return () => window.clearTimeout(t)
  }, [])

  // ステップや もじが かわったら：デイジーちゃんの セリフ → もじの よみ（ステップによる）→ マイクで きく
  useEffect(() => {
    if (phase !== 'learn') return
    setReady(false)
    setAnswered(false)
    setTraceDone(false)
    if (isTest) return
    let alive = true
    const first = idx === 0
    const afterLine = () => {
      if (!alive) return
      // イラスト よみ・なぞり よみ・おいかけ よみ は もじを よんで きかせる。マイク テスト・カンペキテスト は きかせない
      if (step <= 2) sayKana(char, () => alive && setReady(true))
      else setReady(true)
    }
    const t = window.setTimeout(() => {
      if (first) sayBt(STEPS[step].line, afterLine)
      else afterLine()
    }, 350)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [phase, step, idx, char, isTest])

  // ボスバトル：あらわれる → セリフ → カードを なげる → うかんだら よむ
  useEffect(() => {
    if (phase !== 'learn' || !isTest) return
    let on = true
    const timers: number[] = []
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(() => on && fn(), ms))
    if (boss === 'enter') {
      let went = false
      const go = () => {
        if (went) return
        went = true
        setBoss('throw')
      }
      // じゃままるくん「カタカナは よませないぞ〜！」→ デイジーちゃん「たいへん！…」→ なげる
      later(() => sayJama('enter', () => later(() => sayBt('boss', () => later(go, 250)), 150)), 700)
      later(go, 16000) // 音声が ない ときの ほけん
    } else if (boss === 'throw') {
      // カードが ほぼ とどいたら すぐ マイクで きく（みえた しゅんかんに よむ子が おおいので）。
      // じゃままるくんの「これが よめるかな〜？」などは ふきだし だけに して、よんでいる あいだは しゃべらない
      // （ほかの モードと おなじ ききとりやすさに する。ボスだから むずかしく しない）
      later(() => {
        setBoss('ready')
        setReady(true)
      }, 500)
    } else if (boss === 'ready') {
      // なかなか よめないとき：8びょうで ふきだし「どうした〜？」（マイクは とめない・しゃべらない）
      later(() => setSlow(true), 8000)
    }
    return () => {
      on = false
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [phase, isTest, boss, idx])

  /** よめた！ → デイジーちゃん スーパービーム */
  const passBoss = () => {
    if (busy.current || boss !== 'ready') return
    busy.current = true
    retry.reset()
    setReady(false)
    setSlow(false)
    setBoss('hit')
    setHitKey((k) => k + 1)
    playSuperBeam()
    voice.hold(1800)
    const at = idx
    // めいちゅうした あとに じゃままるくん「いててっ！」
    window.setTimeout(() => alive.current && sayJama(jamaKey('hit', at, TEST_N, false)), 550)
    window.setTimeout(() => {
      busy.current = false
      if (!alive.current) return
      if (idx < TEST_N - 1) {
        setIdx(idx + 1)
        setBoss('throw')
      } else {
        // さいごの いちげき！ じゃままるくんを やっつけた
        setBoss('defeat')
        voice.stop()
        playDefeat()
        // じゃままるくん「やられた〜！ おぼえてろ〜！」→ デイジーちゃん「やったね！…」→ はなまる
        let done = false
        const end = () => {
          if (done || !alive.current) return
          done = true
          finish()
        }
        window.setTimeout(() => alive.current && sayJama('defeat', () => window.setTimeout(() => alive.current && sayBt('win', () => window.setTimeout(end, 300)), 200)), 400)
        window.setTimeout(end, 11000) // 音声が ない ときの ほけん
      }
    }, 1700)
  }

  const passOne = () => {
    if (isTest) return passBoss()
    if (busy.current) return
    busy.current = true
    retry.reset()
    playChime()
    voice.hold(900)
    setBurst((b) => b + 1)
    window.setTimeout(() => {
      busy.current = false
      next()
    }, 750)
  }

  const retry = useRetryRegister()
  const voiceTarget = phase === 'learn' && micStep && ready ? char : null
  const wrongOnce = useRef(onceper())
  const onVoicePass = () => {
    // マイク テスト・カンペキテストで ひとりで よめた → いまの にがて度を へらす
    if (step >= 3 && voiceTarget) logCorrect(voiceTarget)
    passOne()
  }
  const voice = useVoiceJudge(voiceTarget, onVoicePass, step * 100 + idx, () => {
    // よんだけど ちがう よみだった → まちがいログ（1もんで 1かいだけ）
    if (voiceTarget) wrongOnce.current(`${step}-${idx}`, () => logError(voiceTarget, 'wrong', 'batchiri'))
    retry.onMiss()
  })
  /** せんせいヘルプで ごうかくにした → 「よめなかった」として ログに のこす */
  const teacherPass = () => {
    if (isTest ? boss !== 'ready' || busy.current : busy.current) return
    logError(char, 'unread', 'batchiri')
    passOne()
  }
  retry.bind(voice)
  const micOk = voice.status === 'listening'

  const goStep = (s: number) => {
    setStep(s)
    setIdx(0)
    setTraceReset((r) => r + 1)
    if (s === TEST_STEP) {
      setTestOrder(makeTestOrder(kana))
      setBoss('enter')
    }
  }

  function next() {
    if (idx < count - 1) {
      setIdx(idx + 1)
      setTraceReset((r) => r + 1)
    } else if (step < TEST_STEP) {
      // マイクは おいかけ よみ から つける（それまでは デイジーちゃんの こえを きれいに きかせる）
      if (step + 1 === 2 && voice.status === 'idle') void voice.start()
      goStep(step + 1)
    } else finish()
  }

  const finish = () => {
    voice.stop()
    // カンペキテスト クリア！ この 3もじの いまの にがて度は はんぶんに
    logCleared(kana)
    setPhase('perfect')
    setBurst((b) => b + 1)
    playFanfare()
    window.setTimeout(() => sayBt('perfect'), 2700)
  }

  const start = () => {
    setPhase('learn')
    goStep(0)
  }

  const retest = () => {
    setPhase('learn')
    goStep(TEST_STEP)
    void voice.start()
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-violet-50 via-stone-50 to-amber-50">
      {/* ヘッダー：ステップの すすみぐあい */}
      <header className="flex items-center gap-3 px-3 pt-3 sm:px-5">
        <button
          type="button"
          onClick={() => {
            voice.stop()
            onExit()
          }}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-amber-200 bg-white text-stone-600"
          aria-label="Menu"
        >
          <House size={24} />
        </button>
        {phase === 'learn' ? (
          <ol className="grid min-w-0 flex-1 grid-cols-5 gap-1.5">
            {[...STEPS.map((s) => s.title), 'Perfect Test'].map((t, i) => (
              <li key={t} className="flex flex-col items-stretch gap-1" aria-current={i === step ? 'step' : undefined}>
                <span className={`h-3 rounded-full ${i < step ? 'bg-violet-400' : i === step ? (i === TEST_STEP ? 'bg-amber-400' : 'bg-violet-500') : 'bg-stone-200'}`} />
                <span className={`truncate text-center text-xs sm:text-sm ${i === step ? 'font-bold text-stone-800' : 'text-stone-400'}`}>{t}</span>
              </li>
            ))}
          </ol>
        ) : (
          <h2 className="min-w-0 flex-1 truncate text-2xl font-bold text-violet-700">Perfect mode!</h2>
        )}
        {phase === 'learn' && <TeacherHelp onPause={voice.pause} onResume={voice.resume} onPass={micStep ? teacherPass : undefined} onHome={onExit} />}
      </header>

      {/* はじめ：にがてな もじの しょうかい */}
      {phase === 'intro' && (
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-4 text-center" style={{ touchAction: 'pan-y' }}>
          <Mascot size={110} mood="cheer" />
          <p className="text-3xl font-bold text-stone-800">Your tricky letters!</p>
          <div className="flex gap-4">
            {kana.map((k, i) => (
              <motion.span
                key={k}
                className="font-card flex h-28 w-28 items-center justify-center rounded-[26px] border-4 border-violet-300 bg-white text-7xl text-stone-900 shadow-[0_6px_0_#ddd6fe] sm:h-32 sm:w-32 sm:text-8xl"
                initial={{ y: -40, opacity: 0, rotate: -10 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.2 + i * 0.18, type: 'spring', stiffness: 260, damping: 14 }}
              >
                {k}
              </motion.span>
            ))}
          </div>
          <ul className="space-y-1 text-lg text-stone-600">
            <li>Picture → Trace → Repeat → Mic test</li>
            <li>
              Read all 9 in the final <span className="font-bold text-amber-600">Perfect Test</span> to win a big gold medal!
            </li>
          </ul>
          {pick.fromLog < kana.length && (
            <p className="max-w-md rounded-2xl bg-white/80 px-4 py-2 text-sm text-stone-500">
              {pick.fromLog === 0 ? 'There are no mistakes saved yet, ' : 'There are only a few mistakes saved, '}so Daisy also picked letters you haven't learned yet.
            </p>
          )}
          <ActionButton icon={<Play />} label="Start" onClick={start} strong />
        </main>
      )}

      {/* れんしゅう・カンペキテスト */}
      {phase === 'learn' && (
        <>
          <div className="flex flex-col items-center gap-1 px-4 pt-3 text-center">
            <h2 className="text-2xl font-bold text-stone-800 sm:text-3xl">
              {isTest ? (
                <span className="text-violet-700">
                  <span className="hidden sm:inline">Perfect Test: </span>Beat Jamamaru!
                </span>
              ) : (
                <span className="text-violet-600">{STEPS[step].title}</span>
              )}
            </h2>
            <p className="text-base text-stone-500 sm:text-lg">{isTest ? 'Read the letter he throws to fire Daisy’s Super Beam!' : STEPS[step].guide}</p>
            <div className={`mt-1 flex gap-2 ${isTest ? 'hidden' : ''}`} aria-label={`${idx + 1} / ${count}`}>
              {Array.from({ length: count }, (_, i) => (
                <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < idx ? (isTest ? 'bg-amber-400' : 'bg-violet-400') : i === idx ? 'bg-amber-500 ring-4 ring-amber-200' : 'bg-stone-200'}`} />
              ))}
            </div>
          </div>

          <main className="min-h-0 flex-1 px-4 py-4">
            {isTest ? (
              <div className="mx-auto h-full w-full max-w-3xl">
                <BossBattle state={boss} char={char} idx={idx} total={TEST_N} hitKey={hitKey} slow={slow} />
              </div>
            ) : (
              <motion.div key={`${step}-${idx}`} className="relative mx-auto h-full w-full max-w-3xl" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22 }}>
                {step === 0 && <Card char={char} variant="picture" onTap={() => sayKana(char)} />}
                {step === 1 && (
                  <TraceCanvas
                    char={char}
                    resetSignal={traceReset}
                    onComplete={() => {
                      // よみあげは なぞり おわった ときに TraceCanvas が する（ここで かさねて ならさない）
                      setTraceDone(true)
                      setBurst((x) => x + 1)
                    }}
                  />
                )}
                {step === 2 && <Card char={char} variant="letter" onTap={() => sayKana(char)} />}
                {step >= 3 && <Card char={char} variant="letter" />}
                {/* おいかけ よみ：デイジーちゃんが よんだら「つぎは きみの ばん！」 */}
                <AnimatePresence>
                  {micStep && ready && (
                    <motion.span
                      className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-violet-500 px-4 py-1.5 text-lg font-bold text-white shadow"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {step === 2 ? 'Your turn!' : 'Read it!'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </main>

          <footer className="flex flex-wrap items-center justify-center gap-3 px-3 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-6">
            {step <= 2 && <ActionButton icon={<Volume2 />} label="Listen" onClick={() => sayKana(char)} />}
            {step === 1 && <ActionButton icon={<Eraser />} label="Again" onClick={() => setTraceReset((r) => r + 1)} />}
            {step === 3 && (
              <ActionButton
                icon={<Volume2 />}
                label={answered ? `「${char}」` : 'Answer'}
                onClick={() => {
                  setAnswered(true)
                  voice.hold(1000)
                  sayKana(char)
                }}
              />
            )}
            {micStep && <MicBadge status={voice.status} frame={voice.frame} error={voice.lastError()} onRetry={() => void voice.start()} heard={voice.heard} canHear={voice.canHear} />}
            {/* マイクが つかえないとき・こえで うまく いかないときの 「できた」 */}
            {micStep && !micOk && voice.status !== 'starting' && (!isTest || boss === 'ready') && <ActionButton label="I did it" onClick={passOne} strong />}
            {!micStep && (
              <motion.button
                type="button"
                onClick={next}
                whileTap={{ scale: 0.94 }}
                animate={step === 1 && traceDone ? { scale: [1, 1.08, 1] } : undefined}
                transition={{ duration: 0.8, repeat: step === 1 && traceDone ? Infinity : 0 }}
                className="flex h-16 items-center gap-1 rounded-full bg-violet-500 px-7 text-xl font-bold text-white shadow-[0_5px_0_#6d28d9]"
              >
                Next <ChevronRight size={26} />
              </motion.button>
            )}
          </footer>
        </>
      )}

      {/* カンペキ！ おおきな はなまる と はくしゅ */}
      {phase === 'perfect' && (
        <main className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto px-4 py-4 text-center" style={{ touchAction: 'pan-y' }}>
          {/* おおきな はなまる と デイジーちゃんの きんメダル（ちいさい がめんでは すこし ちいさく、よこに ならべる） */}
          <div className="mt-auto flex items-center justify-center gap-x-2 sm:gap-x-6">
            <motion.div initial={{ scale: 0.2, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }}>
              <Hanamaru size={narrow ? 170 : 260} />
            </motion.div>
            <GoldMedal size={narrow ? 150 : 220} />
          </div>
          <motion.p className="text-5xl font-bold text-pink-500 drop-shadow-[0_3px_0_#fff]" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
            PERFECT!
          </motion.p>
          <p className="text-xl text-stone-600">
            You can read <span className="font-card text-3xl text-stone-800">{kana.join('・')}</span> <span className="whitespace-nowrap">perfectly!</span>
          </p>
          <p className="rounded-full bg-amber-100 px-4 py-1 text-lg font-bold text-amber-800">You beat Jamamaru and won Daisy's gold medal!</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <ActionButton icon={<RotateCcw />} label="Test again" onClick={retest} />
            <ActionButton icon={<House />} label="Menu" onClick={onExit} strong />
          </div>
          <p className="mb-auto text-sm text-stone-400">Letters you missed in Shooting or the check will show up here.</p>
        </main>
      )}

      <Confetti burst={burst} />
      {retry.element}
      <span className="sr-only" aria-live="polite">
        {KANA_INFO[char].word}
      </span>
    </div>
  )
}
