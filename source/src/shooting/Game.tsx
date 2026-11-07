import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { AudioLines, BookOpen, Heart, House, Mic, Pause, Play, Save, Star } from 'lucide-react'
import { Confetti } from '../components/Celebrate'
import { MicBadge } from '../components/MicStatus'
import { Mascot } from '../components/Mascot'
import { VoiceRegister } from '../components/VoiceRegister'
import type { Kana } from '../data/kana'
import { getAudioContext, playBeam } from '../lib/audio'
import { useVoiceJudge } from '../lib/useVoiceJudge'
import { loadVoiceprint, voiceprintUseful } from '../lib/voiceprint'
import { ActionButton } from '../screens/Learn'
import { GoalRoad } from './GoalRoad'
import { Stamp } from './Stamp'
import { sayKana, sayLine, sayStamp } from './voices'
import { STAMP_TOTAL, clearSave, fallSecAt, getBestScore, loadStamps, pickWord, saveStamps, setBestScore, speedLevel, wordOf, writeSave, type Mode, type SaveData, type WordTask } from './words'

/* ---------- かたち ---------- */

interface Falling {
  id: number
  kana: Kana
  wordUid: number
  slot: number
  x: number // 0〜1（よこ）
  y: number // 0〜1（1 で じめんに つく）
}

interface ActiveWord {
  uid: number
  task: WordTask
  got: boolean[]
  state: 'live' | 'done' | 'failed'
}

interface Hit {
  id: number
  kana: Kana
  x: number
  y: number
}

const LIVES = 3
const LANES = [0.16, 0.38, 0.62, 0.84]
const MAX_LIVE_WORDS = 2
const STAMP_PAUSE_MS = 3000
/** ことばごとの いろ（カードの わくと、うえの ことばの わくを おなじ いろにする） */
const WORD_COLORS = ['#38bdf8', '#f472b6', '#34d399', '#a78bfa']
const colorOf = (uid: number) => WORD_COLORS[uid % WORD_COLORS.length]

type Phase = 'ready' | 'countdown' | 'playing' | 'paused' | 'over'

/** ブブー（カードを おとしたとき） */
function playMiss() {
  try {
    const c = getAudioContext()
    if (c.state === 'suspended') void c.resume()
    const now = c.currentTime
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(220, now)
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.35)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)
    osc.connect(gain).connect(c.destination)
    osc.start(now)
    osc.stop(now + 0.42)
  } catch {
    /* noop */
  }
}

export function Game({ mode, resume, onHome, onZukan }: { mode: Mode; resume?: SaveData | null; onHome: () => void; onZukan: () => void }) {
  const [phase, setPhaseState] = useState<Phase>('ready')
  const phaseRef = useRef<Phase>('ready')
  const setPhase = (p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
  }

  const [cardsView, setCardsView] = useState<Falling[]>([])
  const [words, setWords] = useState<ActiveWord[]>([])
  const [targetId, setTargetId] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [level, setLevel] = useState(1)
  const [hits, setHits] = useState<Hit[]>([])
  const [stampPop, setStampPop] = useState<{ task: WordTask; isNew: boolean; complete: boolean } | null>(null)
  const [roundStamps, setRoundStamps] = useState<{ id: Kana; isNew: boolean }[]>([])
  const [burst, setBurst] = useState(0)
  const [shakeScope, animateShake] = useAnimate()
  const [count, setCount] = useState(3)
  const [result, setResult] = useState<{ score: number; best: number; record: boolean; total: number } | null>(null)
  const [registering, setRegistering] = useState(false)
  const [hasPrint, setHasPrint] = useState(() => !!loadVoiceprint())

  const area = useRef<HTMLDivElement>(null)
  const size = useRef({ W: 0, H: 0, S: 100 })
  const cards = useRef<Falling[]>([])
  const queue = useRef<Omit<Falling, 'x' | 'y'>[]>([])
  const active = useRef<ActiveWord[]>([])
  const els = useRef(new Map<number, HTMLDivElement>())
  const elapsed = useRef(0)
  const nextSpawn = useRef(0)
  const freezeUntil = useRef(0)
  const nextId = useRef(1)
  const nextUid = useRef(1)
  const lastLane = useRef(-1)
  const recent = useRef<Kana[]>([])
  const targetRef = useRef<number | null>(null)
  const override = useRef<number | null>(null)
  const scoreRef = useRef(0)
  const livesRef = useRef(LIVES)
  const stamps = useRef(loadStamps())
  const [stampCount, setStampCount] = useState(() => stamps.current.size)
  const roundRef = useRef<{ id: Kana; isNew: boolean }[]>([])

  /* ---------- 大きさ ---------- */
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    const update = () => {
      const W = el.clientWidth
      const H = el.clientHeight
      size.current = { W, H, S: Math.max(72, Math.min(132, W * 0.19, H * 0.2)) }
      for (const c of cards.current) place(c)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
     
  }, [])

  const place = (c: Falling) => {
    const el = els.current.get(c.id)
    if (!el) return
    const { W, H, S } = size.current
    el.style.width = `${S}px`
    el.style.height = `${S}px`
    el.style.fontSize = `${S}px`
    el.style.transform = `translate(${c.x * W - S / 2}px, ${c.y * H - S}px)`
  }

  const syncCards = () => setCardsView(cards.current.map((c) => ({ ...c })))
  const syncWords = () => setWords(active.current.map((w) => ({ ...w, got: [...w.got] })))

  /* ---------- 音声判定 ---------- */
  const targetKana = phase === 'playing' && !stampPop ? (cardsView.find((c) => c.id === targetId)?.kana ?? null) : null
  const voice = useVoiceJudge(targetKana, () => {
    if (targetRef.current != null) collect(targetRef.current)
  }, targetId ?? 0)
  const micOk = voice.status === 'listening'

  /* ---------- ことばと カード ---------- */
  const newWord = () => {
    const avoid = new Set(active.current.map((w) => w.task.id))
    const task = pickWord(stamps.current, avoid, recent.current)
    recent.current = [task.id, ...recent.current].slice(0, 6)
    const uid = nextUid.current++
    const w: ActiveWord = { uid, task, got: task.letters.map((l) => !l.play), state: 'live' }
    active.current.push(w)
    task.letters.forEach((l, slot) => {
      if (l.play) queue.current.push({ id: 0, kana: l.ch, wordUid: uid, slot })
    })
    syncWords()
  }

  const spawn = (sec: number) => {
    if (!queue.current.length) {
      const live = active.current.filter((w) => w.state === 'live').length
      if (live >= MAX_LIVE_WORDS) {
        nextSpawn.current = elapsed.current + 0.3
        return
      }
      newWord()
    }
    const item = queue.current.shift()!
    let lane = Math.floor(Math.random() * LANES.length)
    if (lane === lastLane.current) lane = (lane + 1 + Math.floor(Math.random() * (LANES.length - 1))) % LANES.length
    lastLane.current = lane
    const c: Falling = { ...item, id: nextId.current++, x: LANES[lane] + (Math.random() - 0.5) * 0.05, y: 0 }
    cards.current.push(c)
    syncCards()
    const lastOfWord = !queue.current.some((q) => q.wordUid === item.wordUid)
    nextSpawn.current = elapsed.current + sec * (lastOfWord ? 0.55 : 0.4)
  }

  const finishWord = (w: ActiveWord) => {
    window.setTimeout(() => {
      active.current = active.current.filter((x) => x !== w)
      syncWords()
    }, w.state === 'done' ? STAMP_PAUSE_MS : 900)
  }

  const collect = useCallback((id: number) => {
    if (phaseRef.current !== 'playing') return
    const c = cards.current.find((x) => x.id === id)
    if (!c) return
    cards.current = cards.current.filter((x) => x.id !== id)
    if (override.current === id) override.current = null
    syncCards()
    const { W, H, S } = size.current
    const hit: Hit = { id: c.id, kana: c.kana, x: c.x * W, y: c.y * H - S / 2 }
    setHits((h) => [...h, hit])
    window.setTimeout(() => setHits((h) => h.filter((x) => x.id !== hit.id)), 700)
    playBeam()
    window.setTimeout(() => sayKana(c.kana), 280)
    voice.hold(800)
    scoreRef.current += 10
    setScore(scoreRef.current)

    const w = active.current.find((x) => x.uid === c.wordUid)
    if (!w || w.state !== 'live') return
    w.got[c.slot] = true
    if (w.got.every(Boolean)) {
      w.state = 'done'
      const isNew = !stamps.current.has(w.task.id)
      stamps.current.add(w.task.id)
      saveStamps(stamps.current)
      scoreRef.current += 20 * w.task.letters.filter((l) => l.play).length
      setScore(scoreRef.current)
      roundRef.current = [...roundRef.current, { id: w.task.id, isNew }]
      setRoundStamps(roundRef.current)
      setStampCount(stamps.current.size)
      const complete = isNew && stamps.current.size >= STAMP_TOTAL
      setStampPop({ task: w.task, isNew, complete })
      setBurst((b) => b + 1)
      freezeUntil.current = performance.now() + STAMP_PAUSE_MS
      // ずんだもんの こえを マイクが ひろわないように、しゃべりおわるまで 判定を とめる
      voice.hold(complete ? 11000 : 4700)
      const id = w.task.id
      window.setTimeout(() => sayStamp(id, complete ? () => sayLine('complete') : undefined), 500)
      window.setTimeout(() => setStampPop(null), STAMP_PAUSE_MS)
      finishWord(w)
    }
    syncWords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const miss = (c: Falling) => {
    // そのことばの カードは ぜんぶ きえて、ことばは しっぱい
    const w = active.current.find((x) => x.uid === c.wordUid)
    cards.current = cards.current.filter((x) => x.wordUid !== c.wordUid)
    queue.current = queue.current.filter((q) => q.wordUid !== c.wordUid)
    if (w) {
      w.state = 'failed'
      finishWord(w)
    }
    syncCards()
    syncWords()
    playMiss()
    window.setTimeout(() => sayLine('miss'), 350)
    voice.hold(1700)
    if (shakeScope.current) void animateShake(shakeScope.current, { x: [0, -12, 12, -6, 6, 0] }, { duration: 0.35 })
    livesRef.current -= 1
    setLives(livesRef.current)
    if (livesRef.current <= 0) gameOver()
  }

  const gameOver = () => {
    setPhase('over')
    voice.stop()
    const best = getBestScore(mode.id)
    const record = scoreRef.current > best
    if (record) setBestScore(mode.id, scoreRef.current)
    setResult({ score: scoreRef.current, best: Math.max(best, scoreRef.current), record, total: stamps.current.size })
    clearSave()
    window.setTimeout(() => sayLine(record && scoreRef.current > 0 ? 'record' : 'over'), 400)
  }

  /* ---------- とちゅうセーブ ---------- */
  const snapshot = (): SaveData => ({
    v: 1,
    mode: mode.id,
    elapsed: elapsed.current,
    score: scoreRef.current,
    lives: livesRef.current,
    words: active.current.filter((w) => w.state === 'live').map((w) => ({ id: w.task.id, got: [...w.got] })),
    round: roundRef.current,
    savedAt: Date.now(),
  })
  const saveNow = () => {
    const p = phaseRef.current
    if ((p === 'playing' || p === 'paused') && livesRef.current > 0) writeSave(snapshot())
  }
  // あそんでいる あいだは 3びょうごとに じどうで セーブ。アプリを とじたときも セーブ
  useEffect(() => {
    const id = window.setInterval(saveNow, 3000)
    window.addEventListener('pagehide', saveNow)
    document.addEventListener('visibilitychange', saveNow)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('pagehide', saveNow)
      document.removeEventListener('visibilitychange', saveNow)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const leave = () => {
    saveNow()
    voice.stop()
    onHome()
  }
  const saveAndQuit = () => {
    saveNow()
    sayLine('saved')
    voice.stop()
    onHome()
  }

  /* ---------- ゲームの ループ ---------- */
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let lvlTimer = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (phaseRef.current !== 'playing' || now < freezeUntil.current) return
      elapsed.current += dt
      const sec = fallSecAt(mode, elapsed.current)
      if (elapsed.current >= nextSpawn.current) spawn(sec)
      for (const c of cards.current) {
        c.y += dt / sec
        place(c)
      }
      const fallen = cards.current.find((c) => c.y >= 1)
      if (fallen) {
        miss(fallen)
        if (phaseRef.current !== 'playing') return
      }
      // ねらう カード：タップで えらんだもの、なければ いちばん下の カード
      let t: Falling | undefined = override.current != null ? cards.current.find((c) => c.id === override.current) : undefined
      if (!t) {
        override.current = null
        for (const c of cards.current) if (!t || c.y > t.y) t = c
      }
      const tid = t?.id ?? null
      if (tid !== targetRef.current) {
        targetRef.current = tid
        setTargetId(tid)
      }
      lvlTimer += dt
      if (lvlTimer > 1) {
        lvlTimer = 0
        setLevel(speedLevel(mode, elapsed.current))
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // べつの アプリに うつったら いったん とめる
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && phaseRef.current === 'playing') setPhase('paused')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  /* ---------- はじめる ---------- */
  const start = async (from?: SaveData | null) => {
    cards.current = []
    queue.current = []
    active.current = []
    els.current.clear()
    override.current = null
    targetRef.current = null
    scoreRef.current = from?.score ?? 0
    livesRef.current = from?.lives ?? LIVES
    roundRef.current = from?.round ?? []
    stamps.current = loadStamps()
    elapsed.current = from?.elapsed ?? 0
    // とちゅうの ことばを もどして、まだ とれていない もじを もういちど ながす
    for (const sw of from?.words ?? []) {
      const task = wordOf(sw.id)
      const uid = nextUid.current++
      const got = task.letters.map((l, i) => !l.play || !!sw.got[i])
      active.current.push({ uid, task, got, state: 'live' })
      task.letters.forEach((l, slot) => {
        if (!got[slot]) queue.current.push({ id: 0, kana: l.ch, wordUid: uid, slot })
      })
    }
    nextSpawn.current = elapsed.current + 0.2
    setCardsView([])
    syncWords()
    setTargetId(null)
    setScore(scoreRef.current)
    setLives(livesRef.current)
    setLevel(speedLevel(mode, elapsed.current))
    setStampCount(stamps.current.size)
    setRoundStamps(roundRef.current)
    setResult(null)
    setStampPop(null)
    setPhase('countdown')
    setCount(3)
    clearSave()
    sayLine(from ? 'resume' : 'start')
    await voice.start()
    voice.hold(from ? 2600 : 4400)
    for (const n of [2, 1]) {
      await new Promise((r) => window.setTimeout(r, 650))
      setCount(n)
    }
    await new Promise((r) => window.setTimeout(r, 650))
    setPhase('playing')
  }

  const tapCard = (id: number) => {
    if (phaseRef.current !== 'playing') return
    if (!micOk) collect(id)
    else {
      override.current = id
    }
  }

  const playing = phase === 'playing' || phase === 'paused'

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-sky-50 via-stone-50 to-amber-50">
      {/* ヘッダー */}
      <header className="flex items-center gap-2 px-3 pt-3 sm:gap-3 sm:px-5">
        <button type="button" onClick={leave} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-amber-200 bg-white text-stone-600" aria-label="メニューへ（セーブされます）">
          <House size={24} />
        </button>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="hidden whitespace-nowrap rounded-full bg-white px-3 py-1 text-sm font-bold text-stone-600 shadow-sm sm:inline sm:text-base">{mode.name}</span>
          {playing && (
            <span className="flex items-center gap-0.5" aria-label={`スピード ${level}`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={18} className={i < level ? 'fill-amber-400 text-amber-400' : 'text-stone-300'} />
              ))}
            </span>
          )}
        </div>
        {playing && (
          <>
            <span className="flex items-center gap-0.5" aria-label={`のこり ${lives}`}>
              {Array.from({ length: LIVES }, (_, i) => (
                <Heart key={i} size={26} className={i < lives ? 'fill-rose-400 text-rose-400' : 'text-stone-300'} />
              ))}
            </span>
            <span className="min-w-[4.5rem] rounded-full bg-white px-3 py-1 text-right text-2xl font-bold tabular-nums text-orange-500 shadow-sm">{score}</span>
            <button
              type="button"
              onClick={() => setPhase(phase === 'paused' ? 'playing' : 'paused')}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-amber-200 bg-white text-stone-600"
              aria-label={phase === 'paused' ? 'つづける' : 'いちじ ていし'}
            >
              {phase === 'paused' ? <Play size={22} /> : <Pause size={22} />}
            </button>
          </>
        )}
      </header>

      {/* ゴールまでの みちのり */}
      {playing && (
        <div className="mx-auto w-full max-w-3xl px-4 pt-2">
          <GoalRoad count={stampCount} compact />
        </div>
      )}

      {/* ことばの トレイ */}
      {playing && (
        <div className="flex min-h-[76px] flex-wrap items-center justify-center gap-2 px-3 pt-2">
          <AnimatePresence>
            {words.map((w) => (
              <motion.div
                key={w.uid}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0, scale: w.state === 'done' ? [1, 1.12, 1] : 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`flex items-center gap-2 rounded-2xl border-4 bg-white px-2 py-1.5 shadow-sm ${w.state === 'failed' ? 'opacity-50' : ''}`}
                style={{ borderColor: colorOf(w.uid) }}
              >
                <Stamp id={w.task.id} size={52} owned={w.state === 'done'} />
                <div className="flex gap-1">
                  {w.task.letters.map((l, i) => (
                    <span
                      key={i}
                      className={`font-card flex h-11 w-9 items-center justify-center rounded-lg text-2xl leading-none sm:h-12 sm:w-10 sm:text-3xl ${
                        !l.play ? 'bg-stone-100 text-stone-400' : w.got[i] ? 'bg-orange-100 text-orange-600' : 'border-2 border-dashed border-stone-300 text-transparent'
                      }`}
                    >
                      {l.ch}
                    </span>
                  ))}
                </div>
                {w.state === 'failed' && <span className="text-sm font-bold text-rose-500">ざんねん</span>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* プレイエリア */}
      <main ref={shakeScope} className="relative min-h-0 flex-1">
        <div ref={area} className="absolute inset-x-0 top-0 bottom-0 overflow-hidden">
          {cardsView.map((c) => {
            const isTarget = c.id === targetId
            return (
              <div
                key={c.id}
                ref={(el) => {
                  if (el) {
                    els.current.set(c.id, el)
                    const live = cards.current.find((x) => x.id === c.id)
                    if (live) place(live)
                  } else els.current.delete(c.id)
                }}
                className="absolute left-0 top-0 will-change-transform"
                onPointerDown={() => tapCard(c.id)}
              >
                <div
                  className={`relative flex h-full w-full items-center justify-center rounded-[22%] bg-white transition-[box-shadow,transform] duration-150 ${isTarget ? 'scale-110' : 'opacity-90'}`}
                  style={{
                    border: `5px solid ${colorOf(c.wordUid)}`,
                    boxShadow: isTarget ? '0 0 0 5px #fff, 0 0 0 10px #f97316, 0 8px 18px rgba(249,115,22,.35)' : '0 5px 0 rgba(0,0,0,.08)',
                  }}
                >
                  <span className="font-card leading-none text-stone-900" style={{ fontSize: '0.62em' }}>
                    {c.kana}
                  </span>
                  {isTarget && (
                    <motion.span
                      className="pointer-events-none absolute -inset-4 rounded-full border-4 border-dashed border-orange-400"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                </div>
              </div>
            )
          })}

          {/* よめ丸くんから びーむ */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            <AnimatePresence>
              {hits.map((h) => (
                <motion.line
                  key={h.id}
                  x1={size.current.W / 2}
                  y1={size.current.H + 10}
                  x2={h.x}
                  y2={h.y}
                  stroke="#fbbf24"
                  strokeWidth={10}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 1 }}
                  animate={{ pathLength: 1, opacity: [1, 1, 0] }}
                  transition={{ duration: 0.45 }}
                />
              ))}
            </AnimatePresence>
          </svg>
          <AnimatePresence>
            {hits.map((h) => (
              <motion.div
                key={h.id}
                className="pointer-events-none absolute flex flex-col items-center"
                style={{ left: h.x, top: h.y, translateX: '-50%', translateY: '-50%' }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.6, 1.3, 1.1], opacity: [0, 1, 0], y: -30 }}
                transition={{ duration: 0.7 }}
              >
                <span className="text-5xl">✨</span>
                <span className="text-3xl font-bold text-orange-500 drop-shadow-[0_2px_0_#fff]">GET!</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {phase === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span key={count} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-9xl font-bold text-orange-500 drop-shadow-[0_4px_0_#fff]">
              {count}
            </motion.span>
          </div>
        )}
        {phase === 'paused' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white/70 backdrop-blur-sm">
            <p className="text-3xl font-bold text-stone-700">ひとやすみ</p>
            <ActionButton icon={<Play />} label="つづける" onClick={() => setPhase('playing')} strong />
            <ActionButton icon={<Save />} label="セーブして やめる" onClick={saveAndQuit} />
            <ActionButton label="ここで おしまい" onClick={gameOver} />
            <p className="px-4 text-center text-base text-stone-500">セーブすると、メニューの「つづきから」で また あそべるよ</p>
          </div>
        )}

        {phase === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto px-4 text-center">
            <Mascot size={120} />
            <p className="text-2xl font-bold leading-relaxed text-stone-800 sm:text-3xl">
              おちてくる カードを
              <br />
              こえに だして よもう！
            </p>
            <ul className="space-y-1 text-lg leading-relaxed text-stone-600">
              <li>
                <span className="font-bold text-orange-500">オレンジの わく</span>の カードを よむと GET！
              </li>
              <li>ことばの カードを ぜんぶ あつめると スタンプが もらえるよ</li>
              <li>カードが したまで おちると ハートが へるよ</li>
            </ul>
            {resume && (
              <p className="rounded-2xl bg-white px-4 py-2 text-lg font-bold text-stone-700 shadow-sm">
                つづきから：{resume.score}てん ・ ハート {resume.lives} ・ スタンプ {resume.round.length}こ
              </p>
            )}
            <ActionButton icon={<Play />} label={resume ? 'つづきから スタート' : 'スタート'} onClick={() => void start(resume)} strong />
            {voiceprintUseful() && (
              <button type="button" onClick={() => setRegistering(true)} className="flex items-center gap-1.5 rounded-full border-2 border-amber-300 bg-white px-4 py-2 text-base font-bold text-stone-700">
                <AudioLines size={18} /> {hasPrint ? 'こえを とうろくしなおす' : 'こえを とうろくすると よく きこえるよ'}
              </button>
            )}
            <p className="flex items-center gap-1 text-sm text-stone-400">
              <Mic size={14} /> マイクが つかえないときは、カードを タッチしても GET できるよ
            </p>
          </div>
        )}
      </main>

      {/* じめん：よめ丸くん と マイク */}
      <footer className="relative flex min-h-[64px] items-end justify-between gap-2 border-t-4 border-lime-300 bg-lime-100 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-1">
        <div className="min-w-0 max-w-[calc(50%-52px)] text-sm">{(phase === 'playing' || phase === 'paused' || phase === 'countdown') && <MicBadge status={voice.status} frame={voice.frame} error={voice.lastError()} onRetry={() => void voice.start()} heard={voice.heard} />}</div>
        <div className="pointer-events-none absolute bottom-[max(6px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2">
          <Mascot size={84} mood={hits.length ? 'cheer' : 'happy'} />
        </div>
        <div className="flex min-w-0 max-w-[calc(50%-52px)] justify-end">
          {phase === 'playing' && !micOk && voice.status !== 'starting' && <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-stone-500">カードを タッチで GET</span>}
        </div>
      </footer>

      {/* スタンプ ゲット */}
      <AnimatePresence>
        {stampPop && (
          <motion.div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-stone-900/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="flex flex-col items-center gap-3 rounded-[32px] border-4 border-rose-200 bg-white px-8 py-6 shadow-xl"
              initial={{ scale: 0.3, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            >
              <p className="text-xl font-bold text-rose-500">{stampPop.complete ? '46こ コンプリート！！' : stampPop.isNew ? 'あたらしい スタンプ！' : 'スタンプ ゲット！'}</p>
              <motion.div initial={{ scale: 2.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, duration: 0.25, ease: 'easeIn' }}>
                <Stamp id={stampPop.task.id} size={150} tilt={-8} />
              </motion.div>
              <p className="font-card text-5xl text-stone-800">{stampPop.task.word}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Confetti burst={burst} />

      {registering && (
        <VoiceRegister
          onCancel={() => setRegistering(false)}
          onDone={() => {
            setRegistering(false)
            setHasPrint(true)
          }}
        />
      )}

      {/* おわり */}
      <AnimatePresence>
        {phase === 'over' && result && (
          <motion.div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-stone-900/30 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="my-auto flex w-full max-w-lg flex-col items-center gap-3 rounded-[32px] border-4 border-amber-200 bg-stone-50 px-5 py-6 text-center shadow-xl"
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18 }}
            >
              <Mascot size={90} mood="cheer" />
              <p className="text-3xl font-bold text-stone-800">おしまい！</p>
              <p className="text-5xl font-bold tabular-nums text-orange-500">{result.score}てん</p>
              {result.record ? <p className="rounded-full bg-orange-100 px-4 py-1 text-lg font-bold text-orange-700">あたらしい さいこう きろく！</p> : result.best > 0 && <p className="text-base text-stone-500">さいこう きろく {result.best}てん</p>}

              <div className="w-full rounded-2xl bg-white p-3">
                <p className="mb-2 text-lg font-bold text-stone-700">きょう ゲットした スタンプ</p>
                {roundStamps.length ? (
                  <div className="flex flex-wrap justify-center gap-4 p-1">
                    {roundStamps.map((s, i) => (
                      <motion.div key={`${s.id}-${i}`} className="flex flex-col items-center gap-1" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.12, type: 'spring', stiffness: 300, damping: 15 }}>
                        <span className="relative">
                          <Stamp id={s.id} size={72} tilt={(i % 2 ? 6 : -6)} />
                          {s.isNew && <span className="absolute -right-2 -top-2 rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">NEW</span>}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-500">こんどは スタンプを ねらおう！</p>
                )}
                <div className="mt-3">
                  <GoalRoad count={result.total} />
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <ActionButton icon={<Play />} label="もういちど" onClick={() => void start()} strong />
                <ActionButton icon={<BookOpen />} label="ずかん" onClick={onZukan} />
                <ActionButton label="メニュー" onClick={onHome} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
