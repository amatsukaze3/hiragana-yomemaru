import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import jamamaru from '../assets/jamamaru.webp'
import yomemaru from '../assets/yomemaru.webp'
import type { Kana } from '../data/kana'
import { JAMA_TEXT, jamaKey, type BossState } from './jama'

/**
 * カンペキテストの ボスバトル：ひらがなじゃままるくん が なげてくる もじを よんで、
 * よめ丸 スーパービームで やっつける（じょうたいは jama.ts の BossState）。
 */
// たての いち（%）：じゃままるくんの まんなか・カードが うかぶ ところ・よめ丸くんの あたま
const BOSS_Y = 26
const CARD_Y = 57
const HERO_TOP = 82

export function BossBattle({ state, char, idx, total, hitKey, slow }: { state: BossState; char: Kana; idx: number; total: number; hitKey: number; slow: boolean }) {
  // あたった かず（ビームが あたる しゅんかんに へらしたいので、hit の ときは すこし おくらせる）
  const hitsDone = idx + (state === 'defeat' ? 1 : 0)
  const [hpShown, setHpShown] = useState(total - hitsDone)
  useEffect(() => {
    if (state === 'hit') {
      const t = window.setTimeout(() => setHpShown(total - idx - 1), 450)
      return () => window.clearTimeout(t)
    }
    setHpShown(total - hitsDone)
  }, [state, idx, total, hitsDone])

  // じゃままるくんの セリフ
  const taunt = JAMA_TEXT[jamaKey(state, idx, total, slow)]

  const showCard = state === 'throw' || state === 'ready' || state === 'hit'

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-gradient-to-b from-[#2a1650] via-[#3b2380] to-[#7c5cc4] shadow-inner">
      {/* ほし */}
      {STARS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${s[0]}%`, top: `${s[1]}%`, width: s[2], height: s[2] }}
          animate={{ opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: 2 + (i % 4) * 0.6, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
      {/* じめん */}
      <div className="absolute inset-x-0 bottom-0 h-[9%] bg-gradient-to-t from-lime-300/70 to-transparent" />

      {/* ぜんたいを ゆらす（めいちゅうの しゅんかん） */}
      <motion.div
        key={`shake-${hitKey}`}
        className="absolute inset-0"
        animate={state === 'hit' || state === 'defeat' ? { x: [0, 0, -12, 12, -8, 8, -4, 0], y: [0, 0, 6, -6, 4, -2, 0, 0] } : undefined}
        transition={{ duration: 0.55, times: [0, 0.6, 0.67, 0.74, 0.81, 0.88, 0.94, 1], ease: 'linear' }}
      >
        {/* じゃままるくんの HP */}
        <div className="absolute inset-x-3 top-3 flex items-center gap-2 sm:inset-x-5">
          <span className="shrink-0 rounded-full bg-white/90 px-3 py-0.5 text-sm font-bold text-violet-800 sm:text-base">じゃままるくん</span>
          <div className="flex min-w-0 flex-1 gap-1" aria-label={`じゃままるくんの たいりょく ${hpShown}`}>
            {Array.from({ length: total }, (_, i) => (
              <motion.span
                key={i}
                className={`h-4 flex-1 rounded-full border-2 sm:h-5 ${i < hpShown ? 'border-fuchsia-200 bg-gradient-to-b from-fuchsia-400 to-violet-600' : 'border-white/30 bg-white/10'}`}
                animate={i === hpShown && state === 'hit' ? { scale: [1, 1.5, 1], backgroundColor: ['#fde047', '#ffffff', 'rgba(255,255,255,.1)'] } : undefined}
                transition={{ duration: 0.4 }}
              />
            ))}
          </div>
        </div>

        {/* じゃままるくん */}
        <AnimatePresence>
          {state !== 'defeat' ? (
            <motion.div
              key="boss"
              className="absolute left-1/2 aspect-[520/569] -translate-x-1/2 -translate-y-1/2"
              style={{ top: `${BOSS_Y}%`, height: '30%' }}
              initial={{ y: '-160%', scale: 0.6, rotate: -20 }}
              animate={{ y: 0, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 11 }}
            >
              <motion.div className="relative h-full w-full" animate={{ y: [0, -8, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
                <motion.img
                  key={`b-${hitKey}`}
                  src={jamamaru}
                  alt="ひらがなじゃままるくん"
                  draggable={false}
                  className="h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,.35)]"
                  animate={state === 'hit' ? { x: [0, 0, -14, 14, -9, 9, 0], rotate: [0, 0, -8, 8, -4, 0, 0] } : undefined}
                  transition={{ duration: 0.75, times: [0, 0.55, 0.65, 0.75, 0.85, 0.93, 1] }}
                />
                {/* ビームが あたると しろく ひかる */}
                {state === 'hit' && (
                  <motion.img
                    key={`f-${hitKey}`}
                    src={jamamaru}
                    alt=""
                    aria-hidden
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                    style={{ filter: 'brightness(0) invert(1)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0, 1, 0, 0.8, 0] }}
                    transition={{ duration: 0.8, times: [0, 0.55, 0.6, 0.72, 0.8, 1] }}
                  />
                )}
              </motion.div>
            </motion.div>
          ) : (
            // やられた：くるくる まわって とんでいく
            <motion.div
              key="boss-down"
              className="absolute left-1/2 aspect-[520/569] -translate-x-1/2 -translate-y-1/2"
              style={{ top: `${BOSS_Y}%`, height: '30%' }}
              initial={{ y: 0, rotate: 0, scale: 1, opacity: 1 }}
              animate={{ y: ['0%', '-10%', '-260%'], x: ['0%', '15%', '120%'], rotate: [0, 120, 900], scale: [1, 1.1, 0.15], opacity: [1, 1, 0] }}
              transition={{ duration: 1.5, delay: 0.3, ease: 'easeIn' }}
            >
              <img src={jamamaru} alt="" className="h-full w-full object-contain" draggable={false} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* じゃままるくんの ふきだし */}
        <AnimatePresence mode="wait">
          <motion.div
            key={taunt}
            className="absolute max-w-[42%] rounded-2xl border-[3px] border-violet-900 bg-white px-3 py-1.5 text-sm font-bold leading-snug text-violet-900 shadow sm:text-lg"
            style={{ left: '62%', top: `${BOSS_Y - 14}%` }}
            initial={{ opacity: 0, scale: 0.6, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            {taunt}
            <span className="absolute -left-[11px] top-1/2 h-0 w-0 -translate-y-1/2 border-y-[8px] border-r-[11px] border-y-transparent border-r-violet-900" />
          </motion.div>
        </AnimatePresence>

        {/* なげてきた もじカード */}
        <AnimatePresence>
          {showCard && (
            <motion.div
              key={`card-${idx}`}
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ height: '25%', aspectRatio: char.length > 1 ? Math.min(4, 0.42 + 0.5 * char.length) : 1, top: `${CARD_Y}%` }}
              initial={{ top: `${BOSS_Y}%`, scale: 0.2, rotate: -270, opacity: 0 }}
              animate={state === 'hit' ? { top: `${CARD_Y}%`, scale: [1, 1, 1.5], rotate: [0, 0, 20], opacity: [1, 1, 0] } : { top: `${CARD_Y}%`, scale: 1, rotate: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={state === 'hit' ? { duration: 0.6, times: [0, 0.55, 1] } : { duration: 0.85, ease: [0.2, 0.9, 0.3, 1.2] }}
            >
              <motion.div
                className="flex h-full w-full items-center justify-center rounded-[22%] border-[6px] border-fuchsia-400 bg-white"
                style={{ boxShadow: state === 'ready' ? '0 0 0 6px #fff, 0 0 0 12px #f97316, 0 0 30px 10px rgba(251,191,36,.6)' : '0 8px 0 rgba(0,0,0,.2)' }}
                animate={state === 'ready' ? { rotate: [-4, 4, -4], y: [0, -6, 0] } : undefined}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="font-card whitespace-nowrap leading-none text-stone-900" style={{ fontSize: char.length > 1 ? 'min(11vh, 84px)' : 'min(16vh, 120px)' }}>
                  {char}
                </span>
              </motion.div>
              {state === 'ready' && (
                <motion.span
                  className={`pointer-events-none absolute -inset-5 border-4 border-dashed border-amber-300 ${char.length > 1 ? 'rounded-[32%]' : 'rounded-full'}`}
                  animate={char.length > 1 ? { scale: [1, 1.05, 1] } : { rotate: 360 }}
                  transition={char.length > 1 ? { duration: 1.2, repeat: Infinity } : { duration: 4, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* よめ丸 スーパービーム */}
        <AnimatePresence>{state === 'hit' && <SuperBeam key={`beam-${hitKey}`} />}</AnimatePresence>
        {/* さいごの いちげきの あとの だいばくはつ */}
        {state === 'defeat' && <Explosion key="final" x={50} y={BOSS_Y} size={70} delay={0} big />}

        {/* よめ丸くん */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: `${HERO_TOP}%`, height: '17%' }}>
          {state === 'hit' && (
            <motion.span
              key={`charge-${hitKey}`}
              className="absolute left-1/2 top-1/2 aspect-square h-[160%] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(254,240,138,.95) 0%, rgba(251,191,36,.6) 40%, transparent 70%)' }}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 1.4, 1, 0.6], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.9, times: [0, 0.28, 0.6, 1] }}
            />
          )}
          <motion.div className="relative h-full" animate={state === 'hit' ? { y: [0, 6, -4, 0] } : { y: 0 }} transition={{ duration: 0.5 }}>
            <motion.img
              src={yomemaru}
              alt="よめ丸くん"
              draggable={false}
              className="h-full w-auto select-none drop-shadow-[0_4px_8px_rgba(0,0,0,.3)]"
              animate={state === 'defeat' ? { y: [0, -14, 0], rotate: [0, -6, 6, 0] } : { y: [0, -5, 0] }}
              transition={{ duration: state === 'defeat' ? 0.9 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* めいちゅうの しゅんかん がめんが ひかる */}
      <AnimatePresence>
        {(state === 'hit' || state === 'defeat') && (
          <motion.div
            key={`flash-${state}-${hitKey}`}
            className="pointer-events-none absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: state === 'defeat' ? [0, 0.85, 0] : [0, 0, 0.6, 0] }}
            exit={{ opacity: 0 }}
            transition={state === 'defeat' ? { duration: 0.5 } : { duration: 0.6, times: [0, 0.55, 0.62, 1] }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/** はいけいの ほし [x%, y%, おおきさpx] */
const STARS: [number, number, number][] = [
  [8, 14, 3],
  [18, 40, 2],
  [27, 9, 2],
  [36, 30, 3],
  [72, 8, 2],
  [81, 34, 3],
  [91, 18, 2],
  [12, 64, 2],
  [88, 60, 2],
  [64, 46, 2],
  [30, 72, 2],
  [76, 76, 3],
]

/**
 * よめ丸 スーパービーム（よめ丸くん → カード → じゃままるくん）
 * 0〜0.25びょう ためる / 0.25びょう はっしゃ / 0.35びょう カードに めいちゅう / 0.45びょう じゃままるくんに めいちゅう
 */
function SuperBeam() {
  const top = BOSS_Y
  const bottom = 100 - HERO_TOP - 4
  return (
    <>
      <motion.div
        className="pointer-events-none absolute left-1/2 w-[clamp(70px,16%,130px)] -translate-x-1/2"
        style={{ top: `${top}%`, bottom: `${bottom}%`, transformOrigin: '50% 100%' }}
        initial={{ scaleY: 0, scaleX: 0.4, opacity: 1 }}
        animate={{ scaleY: [0, 0, 1, 1, 1], scaleX: [0.4, 0.4, 1.25, 0.9, 1.2, 1, 0.2], opacity: [1, 1, 1, 1, 1, 1, 0] }}
        exit={{ opacity: 0 }}
        transition={{
          scaleY: { duration: 0.42, times: [0, 0.6, 0.85, 0.95, 1] },
          scaleX: { duration: 0.95, times: [0, 0.27, 0.4, 0.55, 0.7, 0.85, 1] },
          opacity: { duration: 0.95, times: [0, 0.27, 0.4, 0.55, 0.7, 0.85, 1] },
        }}
      >
        {/* そとがわの ひかり */}
        <div
          className="absolute -inset-x-[40%] inset-y-0 rounded-full blur-xl"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(251,146,60,.75), rgba(253,224,71,.9), rgba(251,146,60,.75), transparent)' }}
        />
        {/* まんなか */}
        <div className="absolute inset-x-[12%] inset-y-0 rounded-full blur-[2px]" style={{ background: 'linear-gradient(90deg, #f59e0b, #fde047 30%, #fef9c3 50%, #fde047 70%, #f59e0b)' }} />
        {/* しん（まっしろ） */}
        <div className="absolute inset-x-[36%] inset-y-0 rounded-full bg-white" style={{ boxShadow: '0 0 18px 6px #fff' }} />
        {/* エネルギーの わ（したから うえへ） */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className="absolute -inset-x-[30%] h-5 rounded-[50%] border-[3px] border-yellow-100"
            style={{ boxShadow: '0 0 10px #fde047' }}
            initial={{ bottom: '0%', opacity: 0 }}
            animate={{ bottom: ['0%', '100%'], opacity: [0, 1, 0] }}
            transition={{ duration: 0.42, delay: 0.27 + i * 0.09, ease: 'linear' }}
          />
        ))}
      </motion.div>
      {/* ひばな */}
      {SPARKS.map(([y, dx, d], i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute h-2 w-2 rounded-full bg-yellow-200"
          style={{ left: '50%', top: `${y}%`, boxShadow: '0 0 8px #fde047' }}
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], x: [0, dx], y: [0, -20 - (i % 3) * 14] }}
          transition={{ duration: 0.5, delay: 0.3 + d }}
        />
      ))}
      {/* めいちゅう：カード と じゃままるくん */}
      <Explosion x={50} y={CARD_Y} size={46} delay={0.33} />
      <Explosion x={50} y={BOSS_Y} size={36} delay={0.45} damage />
    </>
  )
}

const SPARKS: [number, number, number][] = [
  [70, -60, 0],
  [64, 70, 0.04],
  [52, -80, 0.08],
  [46, 66, 0.1],
  [40, -54, 0.14],
  [34, 90, 0.16],
  [60, -100, 0.2],
  [48, 110, 0.22],
  [30, -70, 0.26],
  [74, 50, 0.3],
]

/** ばくはつ（まるい ひかり ＋ ドカーン の もじ） */
function Explosion({ x, y, size, delay, damage = false, big = false }: { x: number; y: number; size: number; delay: number; damage?: boolean; big?: boolean }) {
  return (
    <>
      <motion.span
        className="pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: `${x}%`, top: `${y}%`, height: `${size}%`, background: 'radial-gradient(circle, #fff 0%, #fef08a 25%, #fb923c 50%, rgba(244,63,94,.5) 65%, transparent 72%)' }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: big ? [0, 1.6, 2.4] : [0, 1.2, 1.6], opacity: [0, 1, 0] }}
        transition={{ duration: big ? 0.9 : 0.55, delay, ease: 'easeOut' }}
      />
      {/* とびちる ほし */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2 + 0.3
        const r = big ? 180 : 90
        return (
          <motion.span
            key={i}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-yellow-200"
            style={{ left: `${x}%`, top: `${y}%`, fontSize: big ? 30 : 20, textShadow: '0 0 6px #fbbf24' }}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], x: Math.cos(a) * r, y: Math.sin(a) * r, scale: [0.4, 1.2, 0.6], rotate: 180 }}
            transition={{ duration: big ? 1 : 0.6, delay: delay + 0.03, ease: 'easeOut' }}
          >
            ★
          </motion.span>
        )
      })}
      {damage && (
        <motion.span
          className="pointer-events-none absolute -translate-x-1/2 text-4xl font-black text-rose-500 sm:text-5xl"
          style={{ left: `${x + 14}%`, top: `${y - 4}%`, WebkitTextStroke: '2px #fff', paintOrder: 'stroke' }}
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 1, 0], y: -50, scale: [0.5, 1.3, 1, 1] }}
          transition={{ duration: 0.9, delay }}
        >
          -1
        </motion.span>
      )}
      {!damage && (
        <motion.span
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-4xl font-black text-yellow-300 sm:text-6xl"
          style={{ left: `${x}%`, top: `${y}%`, WebkitTextStroke: '3px #7c2d12', paintOrder: 'stroke' }}
          initial={{ opacity: 0, scale: 0.3, rotate: -12 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.25, 1.1, 1.2], rotate: -8 }}
          transition={{ duration: big ? 1.2 : 0.8, delay: delay + 0.02 }}
        >
          {big ? 'ドカーーン！' : 'ズバーン！'}
        </motion.span>
      )}
    </>
  )
}
