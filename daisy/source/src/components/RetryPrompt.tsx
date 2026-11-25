import { useEffect, useRef, useState } from 'react'
import { AudioLines, KeyRound, Play, Volume2 } from 'lucide-react'
import { Mascot } from './Mascot'
import { sayVoice } from '../lib/audio'
import { VoiceRegister } from './VoiceRegister'
import { canOpenTeacherHelp, openTeacherHelp } from './TeacherHelp'
import type { MissInfo } from '../lib/voice'

/** 5回 読んでも 合格しないとき：声の登録を すすめる */
export const MISS_LIMIT = 5

/**
 * onHelp：「ヘルプ」ボタン（おとな むけ）。せんせいメニュー（暗証番号）を ひらいて、合格の きじゅん（しおん／ぼおん ごうかく）を
 * その子に あわせて かえられる ように する
 */
export function RetryPrompt({ open, onRegister, onContinue, onHelp }: { open: boolean; onRegister: () => void; onContinue: () => void; onHelp?: () => void }) {
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
            aria-label="Listen again"
            className="absolute -right-14 top-6 flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-300 bg-white text-pink-600 shadow-sm"
          >
            <Volume2 size={24} />
          </button>
        </div>
        <p className="text-2xl font-bold leading-relaxed text-stone-800">
          Sorry, I couldn't hear you.
          <br />
          Can you let me hear
          <br />
          your voice again?
        </p>
        <div className="flex w-full flex-col gap-3">
          <button type="button" onClick={onRegister} className="flex items-center justify-center gap-2 rounded-full bg-pink-500 py-3 text-xl font-bold text-white shadow-[0_5px_0_#be185d]">
            <AudioLines size={24} /> Teach Daisy my voice
          </button>
          <button type="button" onClick={onContinue} className="flex items-center justify-center gap-2 rounded-full border-2 border-amber-300 bg-white py-2.5 text-lg font-bold text-stone-700">
            <Play size={20} /> Keep going
          </button>
          {onHelp && (
            <button type="button" onClick={onHelp} className="flex items-center justify-center gap-1.5 self-center rounded-full border-2 border-stone-200 bg-white px-5 py-2 text-base font-bold text-stone-500">
              <KeyRound size={18} /> Help
            </button>
          )}
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

  /** info.vpHelps が false（iPad の 子音の カード：こえの とうろく では よく ならない）なら かぞえない */
  const onMiss = (info?: MissInfo) => {
    if (info && !info.vpHelps) return
    misses.current += 1
    if (misses.current >= MISS_LIMIT && voice.current) {
      misses.current = 0
      voice.current.pause()
      h.current?.onPause?.()
      setPrompt(true)
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
        onHelp={
          canOpenTeacherHelp()
            ? () => {
                // ここの 一時停止は とき、せんせいメニューが あらためて とめる（「つづける」で もどる）
                setPrompt(false)
                voice.current?.resume()
                h.current?.onResume?.()
                openTeacherHelp()
              }
            : undefined
        }
      />
      {reg && <VoiceRegister onCancel={back} onDone={back} />}
    </>
  )
  return {
    bind: (v: VoiceCtl) => void (voice.current = v),
    onMiss,
    reset: () => void (misses.current = 0),
    element,
    active: prompt || reg,
  }
}
