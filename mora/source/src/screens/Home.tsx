import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { AudioLines, BookOpen, ImagePlus, Lock, Mic, Rocket, Timer } from 'lucide-react'
import { VoiceRegister } from '../components/VoiceRegister'
import { Mascot } from '../components/Mascot'
import { GROUPS, ROWS, type Row } from '../data/kana'
import { KanaProgress } from '../components/KanaProgress'
import { Modal } from '../components/Celebrate'
import { allMastered, loadMastered, setShootSeen, shootSeen } from '../lib/progress'
import { getBestScore } from '../shooting/words'
import { batchiriForced } from '../lib/loginDays'
import { playChime } from '../lib/audio'
import { formatTime, getBest } from './Challenge'

interface Props {
  onAssess: () => void
  row: Row
  onRow: (r: Row) => void
  onLearn: () => void
  onChallenge: () => void
  onSettings: () => void
  onShoot: () => void
}

export function Home({ row, onRow, onLearn, onChallenge, onSettings, onAssess, onShoot }: Props) {
  const best = getBest(row.id)
  const [mastered] = useState(loadMastered)
  const done = allMastered(mastered)
  // せんせいが アセスメントの「すぐに だす（せんせい用）」に チェックしたときも、シューティングを 出す
  const unlocked = done || batchiriForced()
  // 95まい ぜんぶ よめたら、はじめての ときだけ お知らせを 出す
  const [announce, setAnnounce] = useState(() => {
    if (done && !shootSeen()) {
      setShootSeen()
      window.setTimeout(playChime, 400)
      return true
    }
    return false
  })
  const shootBest = Math.max(getBestScore('normal'), getBestScore('fast'))
  const [registering, setRegistering] = useState(false)
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
    <div className="relative flex h-full flex-col">
      {/* iPad などでは 上の角に うかせて、たての 場所を ひろく使う */}
      <header className="pointer-events-none z-10 flex justify-between px-4 pt-3 sm:absolute sm:inset-x-0 sm:top-[env(safe-area-inset-top)] [&>*]:pointer-events-auto">
        {/* 左上：いつでも 声の とうろくを しなおせる */}
        <button
          type="button"
          onClick={() => setRegistering(true)}
          className="flex items-center gap-2 rounded-full border-2 border-orange-200 bg-white px-4 py-2 text-sm font-bold text-orange-700 shadow-sm"
        >
          <AudioLines size={20} /> こえの とうろく
        </button>
        <button
          type="button"
          onClick={onSettings}
          className="flex items-center gap-2 rounded-full border-2 border-amber-200 bg-white px-4 py-2 text-sm font-bold text-stone-600 shadow-sm"
        >
          <ImagePlus size={20} /> カード とうろく
        </button>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-4 pb-3 sm:pt-3" style={{ touchAction: 'pan-y' }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={tapMascot} aria-label="よめ丸くん" className="rounded-full">
            <Mascot size={84} />
          </button>
          <h1 className="flex flex-col leading-tight">
            <span className="text-3xl font-bold tracking-wide text-stone-800 sm:text-4xl">
              ひらがな<span className="text-orange-500">よめ丸</span>
            </span>
            <span className="text-xl font-bold tracking-wider text-sky-600 sm:text-2xl">スペシャルモーラ</span>
          </h1>
        </div>

        <KanaProgress mastered={mastered} />

        {/* 行えらび：しゅるいごとに ならべる */}
        <section className="w-full" aria-label="れんしゅうする おとを えらぶ">
          <p className="mb-1.5 text-center text-base text-stone-500">どれに する？</p>
          <div className="flex flex-col gap-1.5">
            {[GROUPS.slice(0, 2), GROUPS.slice(2, 3), GROUPS.slice(3)].map((gs, li) => (
              <ul key={li} className="flex flex-wrap justify-center gap-1.5">
                {ROWS.filter((r) => gs.some((g) => g.id === r.group)).map((r) => {
                  const on = r.id === row.id
                  const word = ['chou', 'hatsu', 'youchou', 'soku'].includes(r.group)
                  return (
                    <li key={r.id}>
                      <motion.button
                        type="button"
                        onClick={() => onRow(r)}
                        whileTap={{ scale: 0.94 }}
                        aria-pressed={on}
                        aria-label={r.name}
                        className={`font-card flex h-11 items-center justify-center rounded-2xl px-2.5 text-xl sm:h-12 sm:text-2xl ${word ? 'min-w-[5.5rem]' : 'min-w-[3.2rem]'} ${
                          on ? 'bg-orange-500 text-white shadow-[0_4px_0_#c2410c]' : 'border-2 border-amber-200 bg-white text-stone-700'
                        }`}
                      >
                        {word ? <span className="whitespace-nowrap text-base sm:text-lg">{r.name}</span> : r.label}
                      </motion.button>
                    </li>
                  )
                })}
              </ul>
            ))}
          </div>
        </section>

        <p className="font-card flex max-w-full flex-wrap items-baseline justify-center gap-x-2 text-xl text-stone-700 sm:text-2xl">
          <span className="text-base text-stone-500">{row.name}</span>
          {row.kana.map((k, i) => (
            <motion.span key={`${row.id}-${k}`} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}>
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
          {/* おまけ（オプション）なので、ひかえめに */}
          <div className="flex justify-center sm:col-span-2">
            {unlocked ? (
              <button type="button" onClick={onShoot} className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-4 py-1.5 text-sm text-sky-700">
                <Rocket size={16} /> よめ丸シューティング{shootBest ? `（さいこう ${shootBest}てん）` : ''}
              </button>
            ) : (
              <p className="flex items-center gap-1 text-xs text-stone-400">
                <Lock size={13} /> ぜんぶの カードを おぼえられたら「よめ丸シューティング」が できるように なるよ。
              </p>
            )}
          </div>
        </div>
      </main>
      {registering && <VoiceRegister onCancel={() => setRegistering(false)} onDone={() => setRegistering(false)} />}
      <Modal open={announce}>
        <Rocket size={72} className="text-sky-500" />
        <p className="text-3xl font-bold text-stone-800">ぜんぶの カードが よめたね！</p>
        <p className="text-xl text-stone-600">「よめ丸シューティング」が あらわれた！</p>
        <Mascot size={100} mood="cheer" />
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => setAnnounce(false)} className="rounded-full border-2 border-amber-300 bg-white px-6 py-3 text-xl font-bold text-stone-700">
            あとで
          </button>
          <button
            type="button"
            onClick={() => {
              setAnnounce(false)
              onShoot()
            }}
            className="rounded-full bg-sky-500 px-6 py-3 text-xl font-bold text-white shadow-[0_5px_0_#0369a1]"
          >
            あそぶ！
          </button>
        </div>
      </Modal>
      <footer className="flex flex-col items-center gap-0.5 px-4 pb-[max(10px,env(safe-area-inset-bottom))] text-center text-xs text-stone-400">
        <span>
          © 2026 TOSS中丹教育サークル 大松幹生 /{' '}
          <a href="./terms.html" target="_blank" rel="noopener" className="text-stone-500 underline">
            アセスメントモードの利用および利用規約
          </a>
          （商用利用不可）
        </span>
        <span>こえ：VOICEVOX:ずんだもん／VOICEVOX:黒沢冴白</span>
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
      className={`flex items-center gap-4 rounded-[28px] px-5 py-3 text-left text-stone-900 ${tone}`}
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
