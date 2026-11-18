import { motion } from 'motion/react'
import { KANA_INFO, type Kana } from '../data/kana'
import { useCards } from '../lib/cards'

/**
 * カードの絵で つくった まるい スタンプ。
 * gold … 「はやい モード」で もらった きんの スタンプ（きんいろの わく・きらきら・ひかりが はしる）
 */
export function Stamp({ id, size = 96, owned = true, gold = false, tilt = 0 }: { id: Kana; size?: number; owned?: boolean; gold?: boolean; tilt?: number }) {
  const { art } = useCards()
  const info = KANA_INFO[id]
  const isGold = owned && gold
  const ring = isGold
    ? `0 0 0 ${Math.max(2, size * 0.035)}px #d97706, 0 0 0 ${Math.max(4, size * 0.07)}px #fde68a, 0 0 0 ${Math.max(5, size * 0.09)}px #b45309, 0 ${size * 0.06}px ${size * 0.18}px rgba(217,119,6,.45)`
    : `0 0 0 ${Math.max(2, size * 0.035)}px #fb7185, 0 0 0 ${Math.max(4, size * 0.07)}px #fff, 0 0 0 ${Math.max(5, size * 0.085)}px #fda4af`
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full ${owned ? (isGold ? '' : 'bg-rose-50') : 'bg-stone-100'}`}
      style={{
        width: size,
        height: size,
        transform: `rotate(${tilt}deg)`,
        background: isGold ? 'conic-gradient(from 200deg, #f59e0b, #fde68a, #fbbf24, #fff7d6, #f59e0b, #fcd34d, #f59e0b)' : undefined,
        boxShadow: owned ? ring : 'inset 0 0 0 2px #e7e5e4',
      }}
      aria-label={owned ? `${info.word}の ${isGold ? 'きんの ' : ''}スタンプ` : 'まだ もっていない スタンプ'}
    >
      {isGold ? (
        // きんの ふちの うちがわは クリームいろに して、絵を はっきり みせる
        <span
          className="flex h-[82%] w-[82%] items-center justify-center rounded-full bg-amber-50"
          style={{
            boxShadow: 'inset 0 0 0 2px #f59e0b, inset 0 2px 6px rgba(180,83,9,.25)',
          }}
        >
          <img src={art[id].url} alt="" draggable={false} className="h-[88%] w-[88%] object-contain mix-blend-multiply" />
        </span>
      ) : (
        <img src={art[id].url} alt="" draggable={false} className="h-[78%] w-[78%] object-contain mix-blend-multiply" style={owned ? undefined : { filter: 'grayscale(1) blur(3px)', opacity: 0.18 }} />
      )}
      {!owned && (
        <span className="absolute text-stone-300" style={{ fontSize: size * 0.4, fontWeight: 700 }}>
          ?
        </span>
      )}
      {isGold && (
        <>
          {/* ひかりが ななめに はしる */}
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
            <motion.span
              className="absolute -inset-y-1/4 w-[35%] rotate-[25deg]"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.85), transparent)',
              }}
              initial={{ left: '-60%' }}
              animate={{ left: ['-60%', '130%'] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                repeatDelay: 2.2,
                ease: 'easeInOut',
              }}
            />
          </span>
          {/* きらきら */}
          <motion.span
            className="pointer-events-none absolute text-amber-400"
            style={{
              top: -size * 0.1,
              right: -size * 0.06,
              fontSize: Math.max(12, size * 0.26),
              lineHeight: 1,
              textShadow: '0 0 4px #fff',
            }}
            animate={{ scale: [0.7, 1.15, 0.7], rotate: [0, 20, 0] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            ✦
          </motion.span>
          <motion.span
            className="pointer-events-none absolute text-amber-300"
            style={{
              bottom: -size * 0.04,
              left: -size * 0.08,
              fontSize: Math.max(10, size * 0.18),
              lineHeight: 1,
              textShadow: '0 0 4px #fff',
            }}
            animate={{ scale: [1.1, 0.6, 1.1] }}
            transition={{ duration: 1.9, repeat: Infinity }}
          >
            ✦
          </motion.span>
        </>
      )}
    </span>
  )
}
