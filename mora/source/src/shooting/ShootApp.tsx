import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, History, House, Lock, Rocket, Sparkles, Trophy, Zap } from 'lucide-react'
import { Mascot } from '../components/Mascot'
import { installUnlockListener } from '../lib/audio'
import { CardsProvider } from '../lib/cards'
import { loadUserFont } from '../lib/font'
import { Batchiri } from './Batchiri'
import { Game } from './Game'
import { GoalRoad } from './GoalRoad'
import { pickWeak, type WeakPick } from '../lib/errorLog'
import { batchiriSeen, batchiriUnlocked, daysUntilBatchiri, installDayTracker, recordToday, setBatchiriSeen } from '../lib/loginDays'
import { Zukan } from './Zukan'
import { MODES, STAMP_TOTAL, getBestScore, loadSave, loadStamps, type ModeId, type SaveData } from './words'

type Screen = { name: 'menu' } | { name: 'game'; mode: ModeId; resume?: SaveData | null } | { name: 'zukan' } | { name: 'batchiri'; pick: WeakPick }

/** スペシャルモーラの 本体 */
export const MAIN_APP_URL = 'https://amatsukaze3.github.io/hiragana-yomemaru/mora/'

/** 単体アプリ（よめ丸シューティング だけの ページ） */
export default function ShootApp() {
  useEffect(() => {
    installUnlockListener()
    installDayTracker()
    void loadUserFont()
  }, [])
  return (
    <CardsProvider>
      <div className="no-touch-scroll h-full overflow-hidden bg-stone-50 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <ShootGame />
      </div>
    </CardsProvider>
  )
}

/**
 * よめ丸シューティング（メニュー・ゲーム・ずかん）
 * onExit を わたすと、ひらがなよめ丸の 中の 1画面として うごく（メニューに「もどる」が でる）。
 */
export function ShootGame({ onExit }: { onExit?: () => void }) {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' })
  const [round, setRound] = useState(0)

  const key = screen.name === 'game' ? `game-${screen.mode}-${round}` : screen.name

  return (
    <div className="h-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div key={key} className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {screen.name === 'menu' && (
            <Menu
              onExit={onExit}
              onPlay={(mode, resume) => {
                setRound((r) => r + 1)
                setScreen({ name: 'game', mode, resume })
              }}
              onZukan={() => setScreen({ name: 'zukan' })}
              onBatchiri={(pick) => setScreen({ name: 'batchiri', pick })}
            />
          )}
          {screen.name === 'game' && <Game mode={MODES[screen.mode]} resume={screen.resume} onHome={() => setScreen({ name: 'menu' })} onZukan={() => setScreen({ name: 'zukan' })} />}
          {screen.name === 'zukan' && <Zukan onHome={() => setScreen({ name: 'menu' })} />}
          {screen.name === 'batchiri' && <Batchiri pick={screen.pick} onExit={() => setScreen({ name: 'menu' })} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Menu({ onPlay, onZukan, onBatchiri, onExit }: { onPlay: (m: ModeId, resume?: SaveData | null) => void; onZukan: () => void; onBatchiri: (pick: WeakPick) => void; onExit?: () => void }) {
  const owned = loadStamps().size
  const save = loadSave()
  const [weak] = useState(() => pickWeak(3))
  // ログイン 3日目から でてくる
  const [unlocked] = useState(() => {
    recordToday() // メニューを だす まえに きょうを かぞえる
    return batchiriUnlocked()
  })
  const [isNew] = useState(() => !batchiriSeen())
  return (
    <div className="relative flex h-full flex-col bg-gradient-to-b from-sky-100 via-stone-50 to-amber-50">
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border-2 border-amber-200 bg-white px-4 py-2 text-base font-bold text-stone-600"
          aria-label="スペシャルモーラに もどる"
        >
          <House size={20} /> もどる
        </button>
      )}
      <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-4" style={{ touchAction: 'pan-y' }}>
        <div className="flex items-center gap-3">
          <Mascot size={110} mood="cheer" />
          <h1 className="text-4xl font-bold leading-tight tracking-wide text-stone-800 sm:text-5xl">
            よめ丸
            <br />
            <span className="text-orange-500">シューティング</span>
            <span className="mt-1 block text-xl text-sky-600 sm:text-2xl">スペシャルモーラ</span>
          </h1>
        </div>
        <p className="text-center text-lg text-stone-600">おちてくる カードを よんで、スタンプを あつめよう！</p>

        <div className="w-full rounded-3xl bg-white/80 px-4 pb-5 pt-3 shadow-sm">
          <GoalRoad count={owned} />
        </div>

        {save && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onPlay(save.mode, save)}
            className="flex w-full items-center justify-center gap-3 rounded-[28px] bg-emerald-500 px-5 py-4 text-white shadow-[0_6px_0_#047857]"
          >
            <History size={32} />
            <span className="flex flex-col items-start">
              <span className="text-3xl font-bold">つづきから</span>
              <span className="text-base opacity-90">
                {MODES[save.mode].name} ・ {save.score}てん ・ ハート {save.lives}
              </span>
            </span>
          </motion.button>
        )}

        <div className="grid w-full gap-3 sm:grid-cols-2">
          {(['normal', 'fast'] as const).map((id) => {
            const m = MODES[id]
            const best = getBestScore(id)
            return (
              <motion.button
                key={id}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onPlay(id)}
                className={`flex flex-col items-center gap-1 rounded-[28px] px-5 py-5 text-white ${id === 'normal' ? 'bg-orange-500 shadow-[0_6px_0_#c2410c]' : 'bg-rose-500 shadow-[0_6px_0_#be123c]'}`}
              >
                <span className="flex items-center gap-2 text-3xl font-bold">
                  {id === 'normal' ? <Rocket size={30} /> : <Zap size={30} />}
                  {m.name}
                </span>
                <span className="flex flex-col items-center text-lg leading-snug opacity-95">
                  {m.sub.map((line) => (
                    <span key={line} className="whitespace-nowrap">
                      {line}
                    </span>
                  ))}
                </span>
                {id === 'fast' && (
                  <span className="mt-1 rounded-full bg-gradient-to-b from-amber-200 to-amber-400 px-3 py-0.5 text-sm font-bold text-amber-900 shadow-sm">✦ きんの スタンプが もらえる！</span>
                )}
                {best > 0 && (
                  <span className="mt-1 flex items-center gap-1 rounded-full bg-white/25 px-3 py-0.5 text-sm">
                    <Trophy size={14} /> さいこう {best}てん
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>

        {save && <p className="-mt-2 text-sm text-stone-500">あたらしく はじめると、セーブした つづきは きえるよ</p>}

        {/* これで ばっちり モード！（にがてな もじを 3つ れんしゅう）… ログイン 3日目から でてくる */}
        {unlocked ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setBatchiriSeen()
              onBatchiri(weak)
            }}
            className="relative flex w-full items-center justify-center gap-4 rounded-[28px] bg-violet-500 px-5 py-4 text-white shadow-[0_6px_0_#6d28d9]"
            initial={isNew ? { scale: 0.6, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          >
            {isNew && (
              <motion.span
                className="absolute -right-2 -top-3 rounded-full bg-rose-500 px-3 py-1 text-sm font-bold text-white shadow"
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                NEW！ あたらしい モード
              </motion.span>
            )}
            <Sparkles size={34} className="shrink-0" />
            <span className="flex flex-col items-start text-left">
              <span className="text-3xl font-bold">これで ばっちり モード！</span>
              <span className="text-lg leading-snug opacity-95">
                <span className="whitespace-nowrap">にがてな もじを 3つ れんしゅうして、</span>
                <span className="whitespace-nowrap">カンペキテストに ちょうせん！</span>
              </span>
            </span>
            <span className="font-card hidden shrink-0 gap-1 sm:flex" aria-hidden>
              {weak.kana.map((k) => (
                <span key={k} className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-3xl text-violet-700">
                  {k}
                </span>
              ))}
            </span>
          </motion.button>
        ) : (
          <div
            className="flex w-full items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-violet-200 bg-white/60 px-5 py-3 text-violet-400"
            aria-label={`あたらしい モードは あと ${daysUntilBatchiri()}にちで でてくるよ`}
          >
            <Lock size={26} className="shrink-0" />
            <span className="text-lg font-bold">
              ？？？ モード … あと <span className="text-2xl tabular-nums text-violet-600">{daysUntilBatchiri()}</span> にち あそぶと でてくるよ！
            </span>
          </div>
        )}

        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={onZukan}
          className="flex items-center gap-3 rounded-full border-2 border-rose-200 bg-white px-6 py-3 text-xl font-bold text-stone-700 shadow-[0_4px_0_#fecdd3]"
        >
          <BookOpen className="text-rose-500" /> スタンプ ずかん
          <span className="rounded-full bg-rose-100 px-3 py-0.5 tabular-nums text-rose-600">
            {owned} / {STAMP_TOTAL}
          </span>
        </motion.button>
      </main>
      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-3 pb-[max(8px,env(safe-area-inset-bottom))] text-center text-xs text-stone-400">
        {!onExit && (
          <a href={MAIN_APP_URL} className="text-sm text-sky-600 underline underline-offset-2">
            スペシャルモーラで れんしゅうする
          </a>
        )}
        <span>こえ：VOICEVOX:ずんだもん／VOICEVOX:黒沢冴白</span>
      </footer>
    </div>
  )
}
