import { useRef } from 'react'
import { motion } from 'motion/react'
import { BookOpen, ImagePlus, Mic, Timer } from 'lucide-react'
import { Mascot } from '../components/Mascot'
import { ROWS, type Row } from '../data/kana'
import { formatTime, getBest } from './Challenge'

interface Props {
  onAssess: () => void
  row: Row
  onRow: (r: Row) => void
  onLearn: () => void
  onChallenge: () => void
  onSettings: () => void
}

export function Home({ row, onRow, onLearn, onChallenge, onSettings, onAssess }: Props) {
  const best = getBest(row.id)
  // 先生用：よめ丸くんを 5回つづけて タップすると アセスメントモード
  const taps = useRef<number[]>([])
  const tapMascot = () => {
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < 2500), now]
    if (taps.current.length >= 5) {
      taps.current = []
      onAssess()
    }
  }
  return (
    <div className="flex h-full flex-col">
      <header className="flex justify-end px-4 pt-3">
        <button
          type="button"
          onClick={onSettings}
          className="flex items-center gap-2 rounded-full border-2 border-amber-200 bg-white px-4 py-2 text-sm font-bold text-stone-600 shadow-sm"
        >
          <ImagePlus size={20} /> カード とうろく
        </button>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 pb-4" style={{ touchAction: 'pan-y' }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={tapMascot} aria-label="よめ丸くん" className="rounded-full">
            <Mascot size={110} />
          </button>
          <h1 className="text-4xl font-bold tracking-wide text-stone-800 sm:text-6xl">
            ひらがな<span className="text-orange-500">よめ丸</span>
          </h1>
        </div>

        {/* 行えらび */}
        <section className="w-full" aria-label="ぎょうを えらぶ">
          <p className="mb-2 text-center text-lg text-stone-500">どの ぎょうに する？</p>
          <ul className="grid grid-cols-5 gap-2">
            {ROWS.map((r) => {
              const on = r.id === row.id
              return (
                <li key={r.id}>
                  <motion.button
                    type="button"
                    onClick={() => onRow(r)}
                    whileTap={{ scale: 0.94 }}
                    aria-pressed={on}
                    className={`font-card flex h-14 w-full items-center justify-center rounded-2xl text-2xl sm:h-16 sm:text-3xl ${
                      on ? 'bg-orange-500 text-white shadow-[0_4px_0_#c2410c]' : 'border-2 border-amber-200 bg-white text-stone-700'
                    }`}
                  >
                    {r.kana[0]}
                  </motion.button>
                </li>
              )
            })}
          </ul>
        </section>

        <p className="font-card flex items-baseline gap-2 text-2xl text-stone-700">
          <span className="text-lg text-stone-500">{row.name}</span>
          {row.kana.map((k, i) => (
            <motion.span key={`${row.id}-${k}`} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
              {k}
            </motion.span>
          ))}
        </p>

        <div className="grid w-full gap-4 sm:grid-cols-2">
          <ModeButton onClick={onLearn} num="①" title="おぼえる" sub="5つの ステップ" icon={<BookOpen size={34} />} tone="bg-amber-400 shadow-[0_8px_0_#d97706]" />
          <ModeButton
            onClick={onChallenge}
            num="②"
            title="チャレンジ おんどく"
            sub={best ? `10もん タイムアタック ・ さいこう ${formatTime(best)}` : '10もん タイムアタック'}
            icon={
              <span className="flex">
                <Mic size={30} />
                <Timer size={30} />
              </span>
            }
            tone="bg-orange-400 shadow-[0_8px_0_#c2410c]"
          />
        </div>
      </main>
      <footer className="flex flex-col items-center gap-0.5 px-4 pb-[max(10px,env(safe-area-inset-bottom))] text-center text-xs text-stone-400">
        <span>
          © 2026 TOSS中丹教育サークル 大松 /{' '}
          <a href="./terms.html" target="_blank" rel="noopener" className="text-stone-500 underline">
            アセスメントモードの利用および利用規約
          </a>
          （商用利用不可）
        </span>
        <span>こえ：VOICEVOX:ずんだもん</span>
      </footer>
    </div>
  )
}

function ModeButton({ onClick, num, title, sub, icon, tone }: { onClick: () => void; num: string; title: string; sub: string; icon: React.ReactNode; tone: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ y: 6, boxShadow: '0 2px 0 rgba(0,0,0,0.15)' }}
      className={`flex items-center gap-4 rounded-[28px] px-6 py-5 text-left text-stone-900 ${tone}`}
    >
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/80">{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className="text-2xl font-bold">
          {num} {title}
        </span>
        <span className="text-base text-stone-800/80">{sub}</span>
      </span>
    </motion.button>
  )
}
