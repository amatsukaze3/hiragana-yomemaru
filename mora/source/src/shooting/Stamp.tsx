import type { CSSProperties } from 'react'
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
      aria-label={owned ? `${info.caption}の ${isGold ? 'きんの ' : ''}スタンプ` : 'まだ もっていない スタンプ'}
    >
      {isGold ? (
        // きんの ふちの うちがわは クリームいろに して、絵を はっきり みせる
        <span
          className="flex h-[82%] w-[82%] items-center justify-center rounded-full bg-amber-50"
          style={{
            boxShadow: 'inset 0 0 0 2px #f59e0b, inset 0 2px 6px rgba(180,83,9,.25)',
          }}
        >
          <StampArt id={id} url={art[id].url} custom={art[id].custom} box={0.82 * 0.88 * size} />
        </span>
      ) : (
        <StampArt id={id} url={art[id].url} custom={art[id].custom} box={0.78 * size} style={owned ? undefined : { filter: 'grayscale(1) blur(3px)', opacity: 0.18 }} />
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

/**
 * スタンプの なかの 絵。
 * はじめから 入っている カードの 絵（1000×760、まんなかの 700×560 に 絵）は 絵の ところだけを 大きく みせる。
 * 絵が ない カード（はっぱ）は ことばを 書く。
 */
function StampArt({ id, url, custom, box, style }: { id: Kana; url: string; custom: boolean; box: number; style?: CSSProperties }) {
  if (!url)
    return (
      <span className="font-card flex items-center justify-center whitespace-nowrap leading-none text-stone-700" style={{ width: box, height: box, fontSize: (box * 0.9) / Math.max(2, KANA_INFO[id].caption.length), ...style }}>
        {KANA_INFO[id].caption}
      </span>
    )
  if (custom) return <img src={url} alt="" draggable={false} className="object-contain mix-blend-multiply" style={{ width: box, height: box, ...style }} />
  const f = box / 700
  return (
    <span className="relative block overflow-hidden" style={{ width: box, height: box, ...style }}>
      <img src={url} alt="" draggable={false} className="absolute max-w-none mix-blend-multiply" style={{ width: 1000 * f, height: 760 * f, left: -150 * f, top: (box - 560 * f) / 2 - 38 * f }} />
    </span>
  )
}
