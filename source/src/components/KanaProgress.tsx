import { motion } from 'motion/react'
import { ROWS, KANA, type Kana, type Row } from '../data/kana'

/**
 * よめたよ バー：46文字のうち「おぼえる」の マイクで よむ で 読めた文字を 色で しめす。
 * 行ごとの たての列（あ行〜わ行）。列を おすと その行を えらぶ。
 */
export function KanaProgress({ mastered, row, onRow }: { mastered: Set<Kana>; row: Row; onRow: (r: Row) => void }) {
  const n = KANA.filter((k) => mastered.has(k)).length
  const pct = (n / KANA.length) * 100
  return (
    <section className="w-full rounded-3xl border-2 border-amber-100 bg-white px-3 pb-2 pt-2" aria-label={`よめた もじ ${n} / ${KANA.length}`}>
      <div className="mb-2 flex items-center gap-3">
        <span className="shrink-0 text-base font-bold text-stone-700">よめたよ</span>
        <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-stone-100">
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-300 to-orange-500" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
        </div>
        <span className="shrink-0 text-base font-bold tabular-nums text-orange-600">
          {n}
          <span className="text-sm text-stone-400"> / {KANA.length}</span>
        </span>
      </div>
      <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
        {ROWS.map((r) => {
          const on = r.id === row.id
          const done = r.kana.every((k) => mastered.has(k))
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onRow(r)}
              aria-label={`${r.name}${done ? '（ぜんぶ よめた）' : ''}`}
              className={`flex flex-col gap-0.5 rounded-xl p-0.5 sm:gap-1 sm:p-1 ${on ? 'bg-amber-100 ring-2 ring-amber-300' : ''}`}
            >
              {r.kana.map((k) => {
                const ok = mastered.has(k)
                return (
                  <span
                    key={k}
                    className={`font-card flex h-6 w-full items-center justify-center rounded-md text-sm leading-none sm:h-7 sm:text-base ${
                      ok ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    {k}
                  </span>
                )
              })}
            </button>
          )
        })}
      </div>
    </section>
  )
}
