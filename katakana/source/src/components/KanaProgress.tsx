import { motion } from 'motion/react'
import { ROWS, KANA, type Kana, type Row } from '../data/kana'

/**
 * よめたよ バー：46文字のうち「おぼえる」の マイクで よむ で 読めた文字を ○ で しめす（読めたら オレンジ）。
 * 行ごとの たての列（あ行〜わ行）。列を おすと その行を えらぶ。
 */
export function KanaProgress({ mastered, row, onRow }: { mastered: Set<Kana>; row: Row; onRow: (r: Row) => void }) {
  const n = KANA.filter((k) => mastered.has(k)).length
  const pct = (n / KANA.length) * 100
  return (
    <section className="flex w-full items-center gap-3 rounded-2xl border-2 border-amber-100 bg-white px-3 py-1.5" aria-label={`よめた もじ ${n} / ${KANA.length}`}>
      <div className="flex w-24 shrink-0 flex-col gap-1">
        <span className="text-sm font-bold text-stone-700">よめたよ</span>
        <span className="text-lg font-bold leading-none tabular-nums text-orange-600">
          {n}
          <span className="text-xs text-stone-400"> / {KANA.length}</span>
        </span>
        <div className="relative h-2 overflow-hidden rounded-full bg-stone-100">
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-300 to-orange-500" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
        </div>
      </div>
      <div className="grid flex-1 grid-cols-10 gap-0.5">
        {ROWS.map((r) => {
          const on = r.id === row.id
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onRow(r)}
              aria-label={`${r.name}：${r.kana.filter((k) => mastered.has(k)).length} / ${r.kana.length}`}
              className={`flex flex-col items-center gap-[3px] rounded-lg py-1 ${on ? 'bg-amber-100 ring-2 ring-amber-300' : ''}`}
            >
              <span className={`font-card text-xs leading-none ${on ? 'font-bold text-stone-800' : 'text-stone-400'}`}>{r.kana[0]}</span>
              {r.kana.map((k) => (
                <span key={k} title={k} className={`block h-3 w-3 rounded-full ${mastered.has(k) ? 'bg-orange-500' : 'border-2 border-stone-300 bg-white'}`} />
              ))}
            </button>
          )
        })}
      </div>
    </section>
  )
}
