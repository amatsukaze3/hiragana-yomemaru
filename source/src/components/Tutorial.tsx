import { useState } from 'react'
import { motion } from 'motion/react'
import { AudioLines, BookOpen, Check, Timer } from 'lucide-react'
import { Mascot } from './Mascot'
import { VoiceRegister } from './VoiceRegister'
import { lsGet, lsSet } from '../lib/storage'

const KEY = 'yomemaru:tutorial'

export function tutorialDone() {
  return lsGet(KEY) === '1'
}

/** はじめて開いたときのチュートリアル：いちばん最初に「こえの とうろく」をする */
export function Tutorial({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState<'welcome' | 'register' | 'done'>('welcome')
  const finish = () => {
    lsSet(KEY, '1')
    onClose()
  }

  if (page === 'register') return <VoiceRegister onDone={() => setPage('done')} onCancel={() => setPage('welcome')} />

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-50 px-4 py-6" style={{ touchAction: 'pan-y' }}>
      <motion.div key={page} className="flex w-full max-w-xl flex-col items-center gap-5 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {page === 'welcome' ? (
          <>
            <Mascot size={130} />
            <p className="text-3xl font-bold text-stone-800">ようこそ！</p>
            <p className="text-2xl font-bold leading-relaxed text-stone-800">
              はじめに、よめ丸くんに
              <br />
              きみの こえを おしえてね
            </p>
            <ol className="flex w-full flex-col gap-2 rounded-3xl border-2 border-amber-100 bg-white p-4 text-left text-lg text-stone-700">
              <Step n={1} icon={<AudioLines size={20} />} text="こえの とうろく（「あ・い・う・え・お」を よむ）" now />
              <Step n={2} icon={<BookOpen size={20} />} text="① おぼえる で もじを おぼえる" />
              <Step n={3} icon={<Timer size={20} />} text="② チャレンジ おんどく で よんでみる" />
            </ol>
            <p className="text-sm leading-relaxed text-stone-500">
              おうちのかた・先生へ：その子の声に あわせて判定するので、正しく読んだときに 合格しやすくなります（約15秒）。
              使う子が かわったら、右上の「カード とうろく」から 登録しなおしてください。
            </p>
            <button type="button" onClick={() => setPage('register')} className="flex items-center gap-2 rounded-full bg-orange-500 px-8 py-4 text-2xl font-bold text-white shadow-[0_5px_0_#c2410c] active:translate-y-1 active:shadow-none">
              <AudioLines size={28} /> こえを とうろくする
            </button>
            <button type="button" onClick={finish} className="text-base text-stone-500 underline">
              あとで する
            </button>
          </>
        ) : (
          <>
            <Mascot size={130} mood="cheer" />
            <p className="text-3xl font-bold text-orange-500">じゅんび かんりょう！</p>
            <p className="text-xl leading-relaxed text-stone-700">
              よめ丸くんが きみの こえを おぼえたよ。
              <br />
              さあ、ひらがなを よんでみよう！
            </p>
            <button type="button" onClick={finish} className="flex items-center gap-2 rounded-full bg-orange-500 px-8 py-4 text-2xl font-bold text-white shadow-[0_5px_0_#c2410c] active:translate-y-1 active:shadow-none">
              <Check size={28} /> はじめる
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}

function Step({ n, icon, text, now }: { n: number; icon: React.ReactNode; text: string; now?: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${now ? 'bg-amber-100 font-bold text-stone-900' : ''}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${now ? 'bg-orange-500 text-white' : 'bg-stone-200 text-stone-600'}`}>{n}</span>
      <span className="text-stone-500">{icon}</span>
      <span>{text}</span>
    </li>
  )
}
