import { useEffect, useRef, useState } from 'react'
import { CircleCheck, Delete, House, KeyRound, Pause, Play } from 'lucide-react'
import { lsGet, lsSet } from '../lib/storage'
import { passMode } from '../lib/voice'
import { usePassMode } from '../lib/useVoiceJudge'

const PIN_KEY = 'flora:teacherPin'

export const hasTeacherPin = () => /^\d{4}$/.test(lsGet(PIN_KEY) ?? '')
export const clearTeacherPin = () => lsSet(PIN_KEY, '')

/**
 * 声の とうろく の 案内（RetryPrompt）の「ヘルプ」から、いま 画面に ある せんせいボタンの メニューを ひらく
 * （暗証番号を いれると、合格の きじゅんを 子どもに あわせて かえられる）
 */
let opener: (() => void) | null = null
export const canOpenTeacherHelp = () => !!opener
export const openTeacherHelp = () => opener?.()

/**
 * せんせい ヘルプ（一時停止・強制合格）
 * はじめて押したときは、先生が 4けたの暗証番号を 決める。2回目からは 暗証番号を 入れると メニューが ひらく。
 */
export function TeacherHelp({ onPause, onResume, onPass, onHome, passLabel = 'ごうかくに する' }: { onPause: () => void; onResume: () => void; onPass?: () => void; onHome?: () => void; passLabel?: string }) {
  const [mode, setMode] = useState<null | 'setup' | 'confirm' | 'pin' | 'menu'>(null)
  const [first, setFirst] = useState('')

  const open = () => {
    onPause()
    setMode(hasTeacherPin() ? 'pin' : 'setup')
  }
  const close = (fn?: () => void) => {
    setMode(null)
    setFirst('')
    onResume()
    fn?.()
  }
  const openRef = useRef(open)
  openRef.current = open
  useEffect(() => {
    const fn = () => openRef.current()
    opener = fn
    return () => {
      if (opener === fn) opener = null
    }
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex h-12 shrink-0 items-center gap-1.5 rounded-full border-2 border-stone-200 bg-white px-3 text-sm font-bold text-stone-500"
        aria-label="せんせい ヘルプ"
      >
        <KeyRound size={18} /> せんせい
      </button>
      {mode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/40 p-4">
          <div className="flex max-h-full w-full max-w-sm flex-col items-center gap-4 overflow-y-auto rounded-[28px] border-4 border-stone-200 bg-stone-50 px-5 py-6 text-center shadow-xl">
            {mode === 'setup' && (
              <PinPad
                title="先生用の暗証番号を決めてください"
                note="4けたの数字です。次回から、このボタンを押すと暗証番号を聞かれます。"
                onDone={(p) => {
                  setFirst(p)
                  setMode('confirm')
                }}
                onCancel={() => close()}
              />
            )}
            {mode === 'confirm' && (
              <PinPad
                title="もう一度 入力してください"
                expect={first}
                wrongText="1回目と ちがいます。最初から やりなおしてください。"
                onWrong={() => {
                  setFirst('')
                  setMode('setup')
                }}
                onDone={(p) => {
                  lsSet(PIN_KEY, p)
                  setMode('menu')
                }}
                onCancel={() => close()}
              />
            )}
            {mode === 'pin' && <PinPad title="せんせいの ばんごう" expect={lsGet(PIN_KEY) ?? ''} wrongText="ばんごうが ちがいます" onDone={() => setMode('menu')} onCancel={() => close()} />}
            {mode === 'menu' && (
              <>
                <p className="flex items-center gap-2 text-2xl font-bold text-stone-700">
                  <Pause size={26} /> いちじ ていし
                </p>
                <div className="flex w-full flex-col gap-3">
                  {onPass && (
                    <button type="button" onClick={() => close(onPass)} className="flex items-center justify-center gap-2 rounded-full bg-violet-500 py-3 text-xl font-bold text-white shadow-[0_5px_0_#6d28d9]">
                      <CircleCheck size={24} /> {passLabel}
                    </button>
                  )}
                  <button type="button" onClick={() => close()} className="flex items-center justify-center gap-2 rounded-full bg-amber-400 py-3 text-xl font-bold text-stone-900 shadow-[0_5px_0_#d97706]">
                    <Play size={24} /> つづける
                  </button>
                  {onHome && (
                    <button type="button" onClick={() => close(onHome)} className="flex items-center justify-center gap-2 rounded-full border-2 border-stone-300 bg-white py-2.5 text-lg font-bold text-stone-600">
                      <House size={20} /> ホームへ
                    </button>
                  )}
                </div>
                <PassModeSwitch />
                <p className="text-xs text-stone-400">暗証番号を忘れたときは、ホームの「カードの とうろく／ことばの せってい」の中で 消せます。</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/**
 * 合格の きじゅん：しおん ごうかく（ふだん。子音まで よめて 合格）／ぼおん ごうかく（構音が 育ちとちゅうの 子むけ。母音が あえば 合格）。
 * おすと すぐ かわり、先生が もう いちど きりかえるまで そのまま（この 端末に おぼえる）
 */
function PassModeSwitch() {
  const m = usePassMode()
  const btn = (on: boolean) =>
    `flex-1 rounded-full py-2.5 text-lg font-bold ${on ? 'bg-violet-500 text-white shadow-[0_4px_0_#6d28d9]' : 'border-2 border-stone-200 bg-white text-stone-500'}`
  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl border-2 border-stone-200 bg-white px-3 py-3">
      <p className="text-sm font-bold text-stone-500">ごうかくの きじゅん</p>
      <div className="flex gap-2" role="radiogroup" aria-label="ごうかくの きじゅん">
        <button type="button" role="radio" aria-checked={m === 'consonant'} onClick={() => passMode.set('consonant')} className={btn(m === 'consonant')}>
          しおん ごうかく
        </button>
        <button type="button" role="radio" aria-checked={m === 'vowel'} onClick={() => passMode.set('vowel')} className={btn(m === 'vowel')}>
          ぼおん ごうかく
        </button>
      </div>
      <p className="text-left text-xs leading-relaxed text-stone-500">
        {m === 'vowel'
          ? '母音が 合っていれば 合格です（「ka」を「a」「ta」と 読んでも 合格）。a・i・u・e・o・wo・n は いつもと 同じです。「しおん ごうかく」を 押すまで このままです。iPad・iPhone は「こえの とうろく」を すると、母音だけの 声も よく ききとれます。'
          : '子音まで 正しく 読めたら 合格です（ふだんの 判定）。構音が 育ちとちゅうの 子には「ぼおん ごうかく」に できます。'}
      </p>
    </div>
  )
}

/** 4けたの 数字を 入れる キーパッド */
function PinPad({ title, note, expect, wrongText, onDone, onWrong, onCancel }: { title: string; note?: string; expect?: string; wrongText?: string; onDone: (pin: string) => void; onWrong?: () => void; onCancel: () => void }) {
  const [v, setV] = useState('')
  const [err, setErr] = useState(false)
  const push = (d: string) => {
    if (v.length >= 4) return
    const n = v + d
    setErr(false)
    if (n.length < 4) return setV(n)
    if (expect !== undefined && n !== expect) {
      setErr(true)
      setV('')
      if (onWrong) window.setTimeout(onWrong, 1200)
      return
    }
    setV(n)
    window.setTimeout(() => onDone(n), 150)
  }
  return (
    <>
      <p className="text-xl font-bold text-stone-800">{title}</p>
      {note && <p className="text-sm leading-relaxed text-stone-500">{note}</p>}
      <div className="flex gap-3" aria-label={`${v.length} けた 入力`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-5 w-5 rounded-full ${i < v.length ? 'bg-stone-700' : 'border-2 border-stone-300'}`} />
        ))}
      </div>
      <p className={`h-5 text-sm font-bold text-rose-500 ${err ? '' : 'invisible'}`}>{wrongText}</p>
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <Key key={d} onClick={() => push(d)}>
            {d}
          </Key>
        ))}
        <Key onClick={onCancel} small>
          やめる
        </Key>
        <Key onClick={() => push('0')}>0</Key>
        <Key onClick={() => setV(v.slice(0, -1))} small label="1つ けす">
          <Delete size={24} />
        </Key>
      </div>
    </>
  )
}

function Key({ children, onClick, small, label }: { children: React.ReactNode; onClick: () => void; small?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-16 w-20 items-center justify-center rounded-2xl border-2 border-stone-200 bg-white font-bold text-stone-700 active:bg-stone-100 ${small ? 'text-base' : 'text-3xl tabular-nums'}`}
    >
      {children}
    </button>
  )
}
