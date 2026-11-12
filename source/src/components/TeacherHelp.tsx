import { useState } from 'react'
import { CircleCheck, Delete, House, KeyRound, Pause, Play } from 'lucide-react'
import { lsGet, lsSet } from '../lib/storage'

const PIN_KEY = 'yomemaru:teacherPin'

export const hasTeacherPin = () => /^\d{4}$/.test(lsGet(PIN_KEY) ?? '')
export const clearTeacherPin = () => lsSet(PIN_KEY, '')

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
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[28px] border-4 border-stone-200 bg-stone-50 px-5 py-6 text-center shadow-xl">
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
                    <button type="button" onClick={() => close(onPass)} className="flex items-center justify-center gap-2 rounded-full bg-orange-500 py-3 text-xl font-bold text-white shadow-[0_5px_0_#c2410c]">
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
                <p className="text-xs text-stone-400">暗証番号を忘れたときは、ホームの「カード とうろく」の中で 消せます。</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
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
