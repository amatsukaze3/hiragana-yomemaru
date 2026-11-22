import { motion } from 'motion/react'
import yomemaru from '../assets/flora.webp'

/** フローラちゃんの おおきな きんメダル（リボンつき・ひかりが はしる） */
export function GoldMedal({ size = 260 }: { size?: number }) {
  const W = size
  const H = size * 1.32
  return (
    <motion.div
      className="relative"
      style={{ width: W, height: H }}
      initial={{ y: -size, rotate: -25, opacity: 0 }}
      animate={{ y: 0, rotate: 0, opacity: 1 }}
      transition={{ delay: 0.6, type: 'spring', stiffness: 140, damping: 11 }}
      aria-label="フローラちゃんの きんメダル"
      role="img"
    >
      <svg viewBox="0 0 200 264" width={W} height={H} className="absolute inset-0 drop-shadow-[0_8px_14px_rgba(180,83,9,.35)]">
        <defs>
          <radialGradient id="gm-disc" cx="38%" cy="32%" r="75%">
            <stop offset="0" stopColor="#fffbeb" />
            <stop offset="0.35" stopColor="#fde68a" />
            <stop offset="0.75" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#b45309" />
          </radialGradient>
          <linearGradient id="gm-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fef3c7" />
            <stop offset="0.5" stopColor="#d97706" />
            <stop offset="1" stopColor="#fcd34d" />
          </linearGradient>
          <clipPath id="gm-clip">
            <circle cx="100" cy="164" r="84" />
          </clipPath>
        </defs>
        {/* リボン */}
        <path d="M58 0 H96 L120 104 L92 112 Z" fill="#ef4444" />
        <path d="M66 0 H78 L104 108 L96 110 Z" fill="#fca5a5" opacity=".7" />
        <path d="M142 0 H104 L80 104 L108 112 Z" fill="#3b82f6" />
        <path d="M134 0 H122 L96 108 L104 110 Z" fill="#93c5fd" opacity=".7" />
        {/* メダル */}
        <circle cx="100" cy="164" r="92" fill="url(#gm-rim)" />
        <circle cx="100" cy="164" r="84" fill="url(#gm-disc)" />
        {/* ふちの ぎざぎざ */}
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i / 36) * Math.PI * 2
          return <circle key={i} cx={100 + Math.cos(a) * 88} cy={164 + Math.sin(a) * 88} r="2.2" fill="#fef3c7" opacity=".85" />
        })}
        <circle cx="100" cy="164" r="70" fill="none" stroke="#fffbeb" strokeWidth="2.5" opacity=".7" />
        {/* カンペキ の もじ（うえに アーチ） */}
        <path id="gm-arc" d="M44 164 A56 56 0 0 1 156 164" fill="none" />
        <text fontSize="17" fontWeight="700" fill="#92400e" letterSpacing="3">
          <textPath href="#gm-arc" startOffset="50%" textAnchor="middle">
            カンペキ
          </textPath>
        </text>
        {/* ほし */}
        <text x="40" y="212" fontSize="16" fill="#fffbeb">★</text>
        <text x="146" y="212" fontSize="16" fill="#fffbeb">★</text>
        {/* ひかりが ななめに はしる */}
        <g clipPath="url(#gm-clip)">
          <motion.rect
            y="60"
            width="34"
            height="220"
            fill="#fff"
            opacity="0.55"
            transform="rotate(25 100 164)"
            initial={{ x: -60 }}
            animate={{ x: [-60, 240] }}
            transition={{ delay: 1.3, duration: 1.1, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
          />
        </g>
      </svg>
      {/* まんなかの フローラちゃん */}
      <img
        src={yomemaru}
        alt=""
        draggable={false}
        className="pointer-events-none absolute"
        style={{ width: W * 0.46, left: '50%', top: `${(176 / 264) * 100}%`, transform: 'translate(-50%, -50%)' }}
      />
      {/* きらきら */}
      {[
        { x: '6%', y: '38%', s: 0.14, d: 0 },
        { x: '86%', y: '44%', s: 0.11, d: 0.5 },
        { x: '80%', y: '88%', s: 0.13, d: 0.9 },
        { x: '10%', y: '84%', s: 0.09, d: 1.3 },
      ].map((k, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute text-amber-300"
          style={{ left: k.x, top: k.y, fontSize: W * k.s, lineHeight: 1, textShadow: '0 0 6px #fff' }}
          animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.4, 1, 0.4], rotate: [0, 25, 0] }}
          transition={{ duration: 1.5, delay: 1 + k.d, repeat: Infinity }}
        >
          ✦
        </motion.span>
      ))}
    </motion.div>
  )
}
