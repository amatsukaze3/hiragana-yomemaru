import { motion } from 'motion/react'
import { BookOpen, ImagePlus, Mic, Timer } from 'lucide-react'
import { Mascot } from '../components/Mascot'
import { KANA } from '../data/kana'
import { formatTime, getBest } from './Challenge'

export function Home({ onLearn, onChallenge, onSettings }: { onLearn: () => void; onChallenge: () => void; onSettings: () => void }) {
  const best = getBest()
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

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 pb-8">
        <div className="flex flex-col items-center gap-1">
          <Mascot size={150} />
          <h1 className="text-5xl font-bold tracking-wide text-stone-800 sm:text-6xl">
            ひらがな<span className="text-orange-500">よめ丸</span>
          </h1>
          <p className="mt-1 flex items-center gap-2 text-lg text-stone-500">
            あぎょう へん
            <span className="font-card flex gap-1 text-2xl text-stone-700">
              {KANA.map((k, i) => (
                <motion.span key={k} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.08 }}>
                  {k}
                </motion.span>
              ))}
            </span>
          </p>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-2">
          <ModeButton
            onClick={onLearn}
            num="①"
            title="おぼえる"
            sub="5つの ステップ"
            icon={<BookOpen size={34} />}
            tone="bg-amber-400 shadow-[0_8px_0_#d97706]"
          />
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
      <footer className="pb-[max(10px,env(safe-area-inset-bottom))] text-center text-xs text-stone-400">こえ：VOICEVOX:ずんだもん</footer>
    </div>
  )
}

function ModeButton({ onClick, num, title, sub, icon, tone }: { onClick: () => void; num: string; title: string; sub: string; icon: React.ReactNode; tone: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ y: 6, boxShadow: '0 2px 0 rgba(0,0,0,0.15)' }}
      className={`flex items-center gap-4 rounded-[28px] px-6 py-6 text-left text-stone-900 ${tone}`}
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
