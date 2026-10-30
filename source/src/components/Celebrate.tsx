import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const COLORS = ['#f59e0b', '#f97316', '#fb7185', '#34d399', '#60a5fa', '#facc15']

/** 紙吹雪。burst が変わるたびに 1 回ふる */
export function Confetti({ burst }: { burst: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        id: `${burst}-${i}`,
        x: Math.random() * 100,
        drift: (Math.random() - 0.5) * 40,
        rot: Math.random() * 720 - 360,
        delay: Math.random() * 0.15,
        dur: 1.1 + Math.random() * 0.8,
        w: 8 + Math.random() * 8,
        h: 10 + Math.random() * 10,
        color: COLORS[i % COLORS.length],
        round: Math.random() < 0.3,
      })),
    [burst],
  )
  if (burst === 0) return null
  return (
    <div key={burst} className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 block"
          style={{ left: `${p.x}%`, width: p.w, height: p.round ? p.w : p.h, background: p.color, borderRadius: p.round ? 999 : 3 }}
          initial={{ y: -40, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '105vh', x: `${p.drift}vw`, rotate: p.rot, opacity: [1, 1, 0.8] }}
          transition={{ duration: p.dur, delay: p.delay, ease: [0.2, 0.6, 0.4, 1] }}
        />
      ))}
    </div>
  )
}

/** はなまる（ぐるぐるの まる と はなびら） */
export function Hanamaru({ size = 220 }: { size?: number }) {
  const petals = Array.from({ length: 9 }, (_, i) => (i / 9) * Math.PI * 2)
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="はなまる" role="img">
      {petals.map((a, i) => {
        const cx = 100 + Math.cos(a) * 74
        const cy = 100 + Math.sin(a) * 74
        return (
          <motion.ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx="20"
            ry="13"
            transform={`rotate(${(a * 180) / Math.PI} ${cx} ${cy})`}
            fill="none"
            stroke="#ef4444"
            strokeWidth="6"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.9 + i * 0.07, duration: 0.25 }}
          />
        )
      })}
      <motion.path
        d="M100 40 C140 40 156 70 152 100 C148 136 118 156 92 152 C62 148 46 120 52 92 C58 66 84 56 104 62 C126 68 134 92 128 110 C122 128 102 134 90 124 C80 116 84 98 100 96"
        fill="none"
        stroke="#ef4444"
        strokeWidth="8"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: 'easeInOut' }}
      />
    </svg>
  )
}

export function Modal({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-30 flex items-center justify-center bg-stone-900/30 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex w-full max-w-md flex-col items-center gap-4 rounded-[32px] border-4 border-amber-200 bg-stone-50 px-6 py-8 text-center shadow-xl"
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 18 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
