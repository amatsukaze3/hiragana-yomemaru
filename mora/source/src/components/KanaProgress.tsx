import { motion } from 'motion/react'
import { GROUPS, KANA, KANA_INFO, type Kana } from '../data/kana'

/**
 * よめたよ バー（スペシャルモーラ版）：特殊音の しゅるいごとに、「おぼえる」の マイクで よむ で 読めた数を しめす。
 */
export function KanaProgress({ mastered }: { mastered: Set<Kana> }) {
  const n = KANA.filter((k) => mastered.has(k)).length
  return (
    <section className="w-full rounded-2xl border-2 border-amber-100 bg-white px-3 py-2" aria-label={`よめた ${n} / ${KANA.length}`}>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-sm font-bold text-stone-700">よめたよ</span>
        <span className="text-lg font-bold leading-none tabular-nums text-orange-600">
          {n}
          <span className="text-xs text-stone-400"> / {KANA.length}</span>
        </span>
      </div>
      <div className="grid grid-cols-4 gap-x-3 gap-y-1.5 sm:grid-cols-7">
        {GROUPS.map((g) => {
          const all = KANA.filter((k) => KANA_INFO[k].group === g.id)
          const ok = all.filter((k) => mastered.has(k)).length
          return (
            <div key={g.id} className="flex flex-col gap-0.5" aria-label={`${g.name} ${ok} / ${all.length}`}>
              <span className="flex items-baseline justify-between text-xs text-stone-500">
                <span className="font-bold text-stone-700">{g.name}</span>
                <span className="tabular-nums">
                  {ok}/{all.length}
                </span>
              </span>
              <div className="relative h-2 overflow-hidden rounded-full bg-stone-100">
                <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-300 to-orange-500" initial={{ width: 0 }} animate={{ width: `${(ok / all.length) * 100}%` }} transition={{ duration: 0.8 }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
