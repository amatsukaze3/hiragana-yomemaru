import { motion } from 'motion/react'
import { Trophy } from 'lucide-react'
import yomemaru from '../assets/yomemaru.webp'
import { STAMP_TOTAL } from './words'

const CHECKPOINTS = [10, 20, 30, 40]

/**
 * ゴール（スタンプ 46こ コンプリート）までの みちのり。
 * よめ丸くんが あつめた かずだけ みちを すすむ。10こごとに チェックポイントの ほし。
 */
export function GoalRoad({ count, compact = false }: { count: number; compact?: boolean }) {
  const n = Math.min(count, STAMP_TOTAL)
  const pct = (n / STAMP_TOTAL) * 100
  const left = STAMP_TOTAL - n
  const h = compact ? 12 : 18
  const head = compact ? 30 : 46

  return (
    <div className="w-full" aria-label={`ゴールまで あと ${left}こ`}>
      {!compact && (
        <div className="mb-1 flex items-baseline justify-between px-1 text-stone-600">
          <span className="text-base font-bold">ゴールまでの みちのり</span>
          <span className="text-base">
            {left > 0 ? (
              <>
                あと <span className="text-2xl font-bold tabular-nums text-rose-500">{left}</span> こ
              </>
            ) : (
              <span className="font-bold text-rose-500">ゴール！</span>
            )}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1" style={{ height: head }}>
          {/* みち */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-stone-200" style={{ height: h }}>
            <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 10px, #fff 10px 14px)' }} />
            <motion.div className="relative h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400" initial={false} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 60, damping: 16 }} />
          </div>
          {/* チェックポイント */}
          {CHECKPOINTS.map((c) => {
            const passed = n >= c
            return (
              <span key={c} className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${(c / STAMP_TOTAL) * 100}%` }}>
                <span className={`flex items-center justify-center rounded-full border-2 ${passed ? 'border-amber-500 bg-amber-300' : 'border-stone-300 bg-white'}`} style={{ width: h + 8, height: h + 8 }}>
                  <span style={{ fontSize: h * 0.75, lineHeight: 1 }}>{passed ? '★' : ''}</span>
                </span>
                {!compact && <span className="absolute top-full mt-0.5 text-xs font-bold tabular-nums text-stone-400">{c}</span>}
              </span>
            )
          })}
          {/* よめ丸くん */}
          <motion.img
            src={yomemaru}
            alt=""
            draggable={false}
            className="pointer-events-none absolute top-1/2 drop-shadow"
            style={{ height: head, translateX: '-50%', translateY: '-58%' }}
            initial={false}
            animate={{ left: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 16 }}
          />
        </div>
        {/* ゴール */}
        <span className={`flex shrink-0 items-center justify-center rounded-full ${left ? 'bg-white text-amber-400 ring-2 ring-amber-200' : 'bg-amber-400 text-white'}`} style={{ width: head, height: head }}>
          <Trophy size={head * 0.55} />
        </span>
        {compact && <span className="shrink-0 text-sm font-bold tabular-nums text-stone-500">{n}/{STAMP_TOTAL}</span>}
      </div>
    </div>
  )
}
