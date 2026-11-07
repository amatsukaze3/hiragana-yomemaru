import { useState } from 'react'
import { House } from 'lucide-react'
import { Confetti } from '../components/Celebrate'
import { KANA_INFO, ROWS } from '../data/kana'
import { GoalRoad } from './GoalRoad'
import { Stamp } from './Stamp'
import { sayWord } from './voices'
import { STAMP_TOTAL, loadStamps } from './words'

/** スタンプずかん（46こ で コンプリート） */
export function Zukan({ onHome }: { onHome: () => void }) {
  const [stamps] = useState(loadStamps)
  const complete = stamps.size >= STAMP_TOTAL
  const [burst] = useState(complete ? 1 : 0)

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 px-3 pt-3 sm:px-5">
        <button type="button" onClick={onHome} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-amber-200 bg-white text-stone-600" aria-label="メニューへ">
          <House size={24} />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-2xl font-bold text-stone-800">スタンプ ずかん</h2>
        <span className="rounded-full bg-white px-4 py-1.5 text-xl font-bold tabular-nums text-rose-500 shadow-sm">
          {stamps.size} / {STAMP_TOTAL}
        </span>
      </header>

      {/* ゴールまでの みちのり */}
      <div className="mx-auto mt-3 w-full max-w-3xl px-4">
        <GoalRoad count={stamps.size} />
      </div>
      {complete && <p className="pt-2 text-center text-2xl font-bold text-rose-500">🎉 コンプリート！ ぜんぶ あつめたね！ 🎉</p>}

      <main className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto px-4 py-3" style={{ touchAction: 'pan-y' }}>
        {ROWS.map((r) => (
          <section key={r.id} className="mb-3">
            <p className="mb-1 text-base font-bold text-stone-500">{r.name}</p>
            <ul className="grid grid-cols-5 gap-2">
              {r.kana.map((k) => {
                const owned = stamps.has(k)
                return (
                  <li key={k}>
                    <button
                      type="button"
                      onClick={() => owned && sayWord(k)}
                      className="flex w-full flex-col items-center gap-1 rounded-2xl bg-white p-2 shadow-sm"
                      aria-label={owned ? KANA_INFO[k].word : 'まだ'}
                    >
                      <Stamp id={k} size={64} owned={owned} />
                      <span className={`font-card text-lg leading-tight ${owned ? 'text-stone-800' : 'text-stone-300'}`}>{owned ? KANA_INFO[k].word : '？？？'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </main>
      <Confetti burst={burst} />
    </div>
  )
}
