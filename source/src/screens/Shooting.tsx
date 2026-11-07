import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Heart, House, Play, Rocket, Trophy } from 'lucide-react'
import yomemaru from '../assets/yomemaru.webp'
import { KANA, type Kana } from '../data/kana'
import { MicBadge } from '../components/MicStatus'
import { Hanamaru } from '../components/Celebrate'
import { playBeam, playMiss } from '../lib/audio'
import { useVoiceJudge } from '../lib/useVoiceJudge'
import { getShootBest, setShootBest } from '../lib/progress'

/**
 * よめ丸くん シューティング（46文字 ぜんぶ よめたら あらわれる）
 * ひらがなの いん石が 上から ふってくる。いちばん下の いん石（光っている）を 声に出して よむと、
 * よめ丸くんが ビームで うちおとす。3回 地面に おちたら おしまい。
 */

interface Rock {
  id: number
  char: Kana
  x: number // 0〜1（よこ）
  y: number // 0〜1（たて：1で 地面）
  speed: number // 1秒あたり
  state: 'fall' | 'hit' | 'miss'
  at: number // hit/miss になった時刻
}

const LIVES = 3

export function Shooting({ onHome }: { onHome: () => void }) {
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready')
  const [, setTick] = useState(0)
  const rocks = useRef<Rock[]>([])
  const nextId = useRef(1)
  const score = useRef(0)
  const lives = useRef(LIVES)
  const lastSpawn = useRef(0)
  const deck = useRef<Kana[]>([])
  const shipX = useRef(0.5)
  const beam = useRef<{ x: number; y: number; at: number } | null>(null)
  const [best, setBest] = useState(getShootBest)
  const [newBest, setNewBest] = useState(false)

  // ねらう いん石：いちばん下（地面に近い）もの
  const target = rocks.current.filter((r) => r.state === 'fall').sort((a, b) => b.y - a.y)[0] ?? null

  const shoot = useCallback((id: number) => {
    const r = rocks.current.find((q) => q.id === id && q.state === 'fall')
    if (!r) return
    r.state = 'hit'
    r.at = performance.now()
    shipX.current = r.x
    beam.current = { x: r.x, y: r.y, at: performance.now() }
    score.current += 1
    playBeam()
  }, [])

  const voice = useVoiceJudge(phase === 'play' && target ? target.char : null, () => {
    if (target) {
      shoot(target.id)
      voice.hold(350)
    }
  }, target?.id)

  const drawKana = () => {
    if (deck.current.length === 0) {
      deck.current = [...KANA].sort(() => Math.random() - 0.5)
    }
    return deck.current.pop()!
  }

  // ゲームのループ
  useEffect(() => {
    if (phase !== 'play') return
    let raf = 0
    let prev = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const s = score.current
      // だんだん 速く・多く
      const fallSec = Math.max(5.5, 12 - s * 0.25)
      const maxAlive = s < 6 ? 1 : s < 18 ? 2 : 3
      const every = Math.max(1.6, 4.5 - s * 0.1) * 1000
      const alive = rocks.current.filter((r) => r.state === 'fall')
      if (alive.length === 0 || (alive.length < maxAlive && now - lastSpawn.current > every)) {
        lastSpawn.current = now
        const used = alive.map((r) => r.x)
        let x = 0.15 + Math.random() * 0.7
        for (let k = 0; k < 6 && used.some((u) => Math.abs(u - x) < 0.2); k++) x = 0.15 + Math.random() * 0.7
        rocks.current.push({ id: nextId.current++, char: drawKana(), x, y: -0.05, speed: 1 / fallSec, state: 'fall', at: 0 })
      }
      for (const r of rocks.current) {
        if (r.state !== 'fall') continue
        r.y += r.speed * dt
        if (r.y >= 0.86) {
          r.state = 'miss'
          r.at = now
          lives.current -= 1
          playMiss()
        }
      }
      rocks.current = rocks.current.filter((r) => r.state === 'fall' || now - r.at < 700)
      if (lives.current <= 0) {
        finish()
        return
      }
      setTick((t) => t + 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const begin = async () => {
    rocks.current = []
    score.current = 0
    lives.current = LIVES
    lastSpawn.current = 0
    beam.current = null
    shipX.current = 0.5
    setNewBest(false)
    setPhase('play')
    if (voice.status !== 'listening') await voice.start()
  }

  const finish = () => {
    voice.stop()
    if (score.current > best) {
      setShootBest(score.current)
      setBest(score.current)
      setNewBest(true)
    }
    setPhase('over')
  }

  useEffect(() => () => voice.stop(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const micOk = voice.status === 'listening' || voice.status === 'starting'
  const now = performance.now()
  const b = beam.current && now - beam.current.at < 260 ? beam.current : null

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-sky-100 via-sky-50 to-amber-50">
      <header className="z-10 flex items-center gap-3 px-3 pt-3 sm:px-5">
        <button type="button" onClick={onHome} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-amber-200 bg-white text-stone-600" aria-label="ホームへ">
          <House size={24} />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-xl font-bold text-stone-800 sm:text-2xl">よめ丸くん シューティング</h2>
        {phase === 'play' && (
          <>
            <span className="flex gap-1" aria-label={`のこり ${lives.current}`}>
              {Array.from({ length: LIVES }, (_, i) => (
                <Heart key={i} size={28} className={i < lives.current ? 'fill-rose-400 text-rose-400' : 'text-stone-300'} />
              ))}
            </span>
            <span className="rounded-full bg-white px-4 py-1 text-2xl font-bold tabular-nums text-orange-600 shadow-sm">{score.current}</span>
          </>
        )}
      </header>

      {/* ゲームの そら */}
      <main className="relative min-h-0 flex-1">
        {phase === 'play' &&
          rocks.current.map((r) => {
            const isTarget = r.state === 'fall' && target?.id === r.id
            const age = r.state === 'fall' ? 0 : (now - r.at) / 700
            return (
              <button
                key={r.id}
                type="button"
                // マイクが使えないときだけ、タップで うてる
                onClick={() => !micOk && shoot(r.id)}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: 'clamp(84px, 13vmin, 140px)', height: 'clamp(84px, 13vmin, 140px)' }}
                aria-label={r.char}
              >
                {r.state === 'hit' ? (
                  <Burst age={age} />
                ) : (
                  <span
                    className={`font-card flex h-full w-full items-center justify-center rounded-full text-[clamp(48px,8vmin,84px)] leading-none ${
                      r.state === 'miss' ? 'bg-stone-300 text-stone-500' : isTarget ? 'bg-white text-stone-900 ring-8 ring-orange-400' : 'bg-white/80 text-stone-500 ring-4 ring-stone-200'
                    }`}
                    style={{
                      opacity: r.state === 'miss' ? 1 - age : 1,
                      boxShadow: isTarget ? '0 0 32px 8px rgba(251,146,60,0.55)' : undefined,
                    }}
                  >
                    {r.char}
                  </span>
                )}
              </button>
            )
          })}

        {/* ビーム */}
        {phase === 'play' && b && (
          <span
            className="absolute w-3 -translate-x-1/2 rounded-full bg-gradient-to-t from-amber-300 via-orange-400 to-rose-400"
            style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, height: `${(0.9 - b.y) * 100}%`, opacity: 1 - (now - (beam.current?.at ?? now)) / 260 }}
          />
        )}

        {/* じめん と よめ丸くん */}
        <div className="absolute inset-x-0 bottom-0 h-[10%] bg-gradient-to-t from-amber-200 to-amber-100" />
        <motion.img
          src={yomemaru}
          alt="よめ丸くん"
          className="absolute bottom-[3%] w-[clamp(80px,12vmin,130px)] -translate-x-1/2"
          animate={{ left: `${shipX.current * 100}%` }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          draggable={false}
        />

        {phase === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center">
            <Rocket size={64} className="text-sky-500" />
            <p className="text-2xl font-bold leading-relaxed text-stone-800 sm:text-3xl">
              ひかっている いん石の もじを
              <br />
              こえに だして よもう！
            </p>
            <p className="text-lg text-stone-500">よめ丸くんが ビームで うちおとすよ。3かい おちたら おしまい。</p>
            {best > 0 && (
              <p className="flex items-center gap-1 text-lg text-stone-600">
                <Trophy size={20} className="text-amber-500" /> さいこう {best}こ
              </p>
            )}
            <button type="button" onClick={() => void begin()} className="flex items-center gap-2 rounded-full bg-sky-500 px-10 py-4 text-3xl font-bold text-white shadow-[0_6px_0_#0369a1] active:translate-y-1 active:shadow-none">
              <Play size={32} /> スタート
            </button>
          </div>
        )}
      </main>

      {phase === 'play' && (
        <footer className="z-10 flex justify-center px-4 pb-[max(10px,env(safe-area-inset-bottom))]">
          <MicBadge status={voice.status} frame={voice.frame} error={voice.lastError()} onRetry={() => void voice.start()} heard={voice.heard} />
          {!micOk && <span className="ml-3 self-center text-sm text-stone-500">マイクが つかえないときは、いん石を タップ</span>}
        </footer>
      )}

      {phase === 'over' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-900/30 p-4">
          <motion.div className="flex w-full max-w-md flex-col items-center gap-3 rounded-[32px] border-4 border-sky-200 bg-stone-50 px-6 py-8 text-center shadow-xl" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
            {newBest && score.current > 0 ? <Hanamaru size={150} /> : <Rocket size={56} className="text-sky-500" />}
            <p className="text-2xl font-bold text-stone-700">うちおとした いん石</p>
            <p className="text-6xl font-bold tabular-nums text-orange-500">{score.current}こ</p>
            {newBest && score.current > 0 ? <p className="text-xl font-bold text-rose-500">しんきろく！</p> : <p className="text-lg text-stone-500">さいこう {best}こ</p>}
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={onHome} className="rounded-full border-2 border-amber-300 bg-white px-6 py-3 text-xl font-bold text-stone-700">
                ホームへ
              </button>
              <button type="button" onClick={() => void begin()} className="rounded-full bg-sky-500 px-6 py-3 text-xl font-bold text-white shadow-[0_5px_0_#0369a1]">
                もういちど
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

/** 爆発：ひろがる わと、とびちる 星 */
function Burst({ age }: { age: number }) {
  return (
    <span className="relative block h-full w-full">
      <span className="absolute inset-0 rounded-full border-8 border-orange-400" style={{ transform: `scale(${0.6 + age * 1.2})`, opacity: 1 - age }} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        const d = 20 + age * 70
        return (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-4 w-4 rounded-full bg-amber-400"
            style={{ transform: `translate(-50%,-50%) translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px)`, opacity: 1 - age }}
          />
        )
      })}
      <span className="absolute left-1/2 top-0 -translate-x-1/2 text-3xl font-bold text-orange-500" style={{ transform: `translate(-50%, ${-age * 40}px)`, opacity: 1 - age }}>
        +1
      </span>
    </span>
  )
}
