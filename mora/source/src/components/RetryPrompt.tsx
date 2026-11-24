import { useEffect, useRef, useState } from 'react'
import { AudioLines, Play, Volume2 } from 'lucide-react'
import { Mascot } from './Mascot'
import { sayVoice } from '../lib/audio'
import { isMulti, type Kana } from '../data/kana'
import { VoiceRegister } from './VoiceRegister'

/** 5回 読んでも 合格しないとき：声の登録を すすめる */
export const MISS_LIMIT = 5

export function RetryPrompt({ open, onRegister, onContinue }: { open: boolean; onRegister: () => void; onContinue: () => void }) {
  useEffect(() => {
    if (open) sayVoice('retry_register')
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-[32px] border-4 border-amber-200 bg-stone-50 px-6 py-7 text-center shadow-xl">
        <div className="relative">
          <Mascot size={96} />
          {/* もういちど きく（iPad で 自動の読み上げが 鳴らなかったときも、タップで 鳴らせる） */}
          <button
            type="button"
            onClick={() => sayVoice('retry_register')}
            aria-label="もういちど きく"
            className="absolute -right-14 top-6 flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-300 bg-white text-orange-600 shadow-sm"
          >
            <Volume2 size={24} />
          </button>
        </div>
        <p className="text-2xl font-bold leading-relaxed text-stone-800">
          うまく ききとれなくて ごめんね。
          <br />
          もういちど きみの こえを
          <br />
          きかせて ほしいのだ。
        </p>
        <div className="flex w-full flex-col gap-3">
          <button type="button" onClick={onRegister} className="flex items-center justify-center gap-2 rounded-full bg-orange-500 py-3 text-xl font-bold text-white shadow-[0_5px_0_#c2410c]">
            <AudioLines size={24} /> こえを とうろくする
          </button>
          <button type="button" onClick={onContinue} className="flex items-center justify-center gap-2 rounded-full border-2 border-amber-300 bg-white py-2.5 text-lg font-bold text-stone-700">
            <Play size={20} /> このまま つづける
          </button>
        </div>
      </div>
    </div>
  )
}

type VoiceCtl = { pause: () => void; resume: () => void; stop: () => void; start: () => Promise<unknown> }

/**
 * 「読んだのに 合格しない」が 5回 つづいたら、声の登録を すすめる しくみ。
 * 合格したら reset() で 数えなおす。onPause/onResume は ゲームの時間を止めるため。
 */
export function useRetryRegister(hooks?: { onPause?: () => void; onResume?: () => void }) {
  const [prompt, setPrompt] = useState(false)
  const [reg, setReg] = useState(false)
  const misses = useRef(0)
  const voice = useRef<VoiceCtl | null>(null)
  const h = useRef(hooks)
  h.current = hooks

  // 1つの 音の カード（が・きゃ など）で 合格しなかったら「ながーく よんでね」（1かいめ・3かいめ）。
  // みじかい 1音は 音声認識が ききとりにくく、母音も はっきり しない（2026-11-24）
  const [hint, setHint] = useState(false)
  const hintTimer = useRef(0)
  const onMiss = (k?: Kana) => {
    misses.current += 1
    if (misses.current >= MISS_LIMIT && voice.current) {
      misses.current = 0
      setHint(false)
      voice.current.pause()
      h.current?.onPause?.()
      setPrompt(true)
      return
    }
    if (k && !isMulti(k) && (misses.current === 1 || misses.current === 3)) {
      setHint(true)
      window.clearTimeout(hintTimer.current)
      hintTimer.current = window.setTimeout(() => setHint(false), 6000)
      // ずんだもんが しゃべって いる あいだは 判定しない（ずんだもんの 声で 合格しない ように）
      // （音が ならなかった ときも 6びょうで もどす）
      // （行の テストの 時計も とめる）
      voice.current?.pause()
      h.current?.onPause?.()
      let back = false
      const resume = () => {
        if (back) return
        back = true
        voice.current?.resume()
        h.current?.onResume?.()
      }
      sayVoice('nagaku', resume)
      window.setTimeout(resume, 6000)
    }
  }
  const back = () => {
    setReg(false)
    misses.current = 0
    // 新しい登録を 読みこみなおすため、マイクを はじめから うごかす
    void voice.current?.start()
    h.current?.onResume?.()
  }
  const element = (
    <>
      {hint && !prompt && !reg && (
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border-4 border-amber-200 bg-white/95 px-5 py-2 shadow-lg">
            <Mascot size={44} />
            <p className="text-xl font-bold text-stone-800">こえを ながーく のばして よんでね</p>
          </div>
        </div>
      )}
      <RetryPrompt
        open={prompt}
        onRegister={() => {
          setPrompt(false)
          voice.current?.stop()
          setReg(true)
        }}
        onContinue={() => {
          setPrompt(false)
          voice.current?.resume()
          h.current?.onResume?.()
        }}
      />
      {reg && <VoiceRegister onCancel={back} onDone={back} />}
    </>
  )
  return {
    bind: (v: VoiceCtl) => void (voice.current = v),
    onMiss,
    reset: () => {
      misses.current = 0
      setHint(false)
    },
    element,
    active: prompt || reg,
  }
}
