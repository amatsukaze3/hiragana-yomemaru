import { useState } from 'react'
import { motion } from 'motion/react'
import { AudioLines, BookOpen, Check, Timer } from 'lucide-react'
import { Mascot } from './Mascot'
import { VoiceRegister } from './VoiceRegister'
import { lsGet, lsSet } from '../lib/storage'

const KEY = 'daisy:tutorial'

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
            <p className="text-3xl font-bold text-stone-800">Welcome!</p>
            <p className="text-2xl font-bold leading-relaxed text-stone-800">
              First, let's teach Daisy
              <br />
              what your voice sounds like
            </p>
            <ol className="flex w-full flex-col gap-2 rounded-3xl border-2 border-amber-100 bg-white p-4 text-left text-lg text-stone-700">
              <Step n={1} icon={<AudioLines size={20} />} text="My voice (say あ・い・う・え・お・ん)" now />
              <Step n={2} icon={<BookOpen size={20} />} text="① Learn the letters" />
              <Step n={3} icon={<Timer size={20} />} text="② Try the reading challenge" />
            </ol>
            <p className="text-sm leading-relaxed text-stone-500">
              For parents & teachers / 保護者・先生へ: Daisy tunes the reading check to this child’s voice, so correct readings pass more easily (about 15 seconds). その子の声に合わせて判定します（約15秒）。
              If a different child uses the app, register again from “Settings” (top right). 使う子がかわったら、右上の「Settings」から登録しなおしてください。
            </p>
            <button type="button" onClick={() => setPage('register')} className="flex items-center gap-2 rounded-full bg-pink-500 px-8 py-4 text-2xl font-bold text-white shadow-[0_5px_0_#be185d] active:translate-y-1 active:shadow-none">
              <AudioLines size={28} /> Teach Daisy my voice
            </button>
            <button type="button" onClick={finish} className="text-base text-stone-500 underline">
              Later
            </button>
          </>
        ) : (
          <>
            <Mascot size={130} mood="cheer" />
            <p className="text-3xl font-bold text-pink-500">All set!</p>
            <p className="text-xl leading-relaxed text-stone-700">
              Daisy knows your voice now.
              <br />
              Let's read hiragana!
            </p>
            <button type="button" onClick={finish} className="flex items-center gap-2 rounded-full bg-pink-500 px-8 py-4 text-2xl font-bold text-white shadow-[0_5px_0_#be185d] active:translate-y-1 active:shadow-none">
              <Check size={28} /> Let's go
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
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${now ? 'bg-pink-500 text-white' : 'bg-stone-200 text-stone-600'}`}>{n}</span>
      <span className="text-stone-500">{icon}</span>
      <span>{text}</span>
    </li>
  )
}
