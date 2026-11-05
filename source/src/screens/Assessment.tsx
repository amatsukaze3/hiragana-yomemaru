import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ClipboardList, House, Play, SkipForward, Trash2, Volume2, X } from 'lucide-react'
import { Card } from '../components/Card'
import { Confetti, Hanamaru } from '../components/Celebrate'
import { MicBadge } from '../components/MicStatus'
import { Mascot } from '../components/Mascot'
import { KANA, smartShuffle, type Kana } from '../data/kana'
import { addRecord, clearRecords, formatDate, loadRecords, remark, type AssessRecord } from '../lib/assessRecords'
import { playChime, sayVoice } from '../lib/audio'
import { useVoiceJudge } from '../lib/useVoiceJudge'
import { ActionButton } from './Learn'

type Phase = 'menu' | 'name' | 'test' | 'result'

const HIRAGANA = /^[ぁ-ゖー]+$/

export function Assessment({ onHome }: { onHome: () => void }) {
  const [phase, setPhase] = useState<Phase>('menu')
  const [records, setRecords] = useState<AssessRecord[]>(loadRecords)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(false)
  const [order, setOrder] = useState<Kana[]>([])
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [manual, setManual] = useState(0)
  const [burst, setBurst] = useState(0)
  const [last, setLast] = useState<AssessRecord | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [starting, setStarting] = useState(false)
  const busy = useRef(false)

  const target = phase === 'test' && order.length ? order[idx] : null

  const answer = (ok: boolean, how: 'voice' | 'manual' | 'skip') => {
    if (busy.current || phase !== 'test') return
    busy.current = true
    const k = order[idx]
    const next = { ...results, [k]: ok }
    setResults(next)
    if (how === 'manual') setManual((m) => m + 1)
    if (ok) {
      playChime()
      voice.hold(900)
      setBurst((b) => b + 1)
    }
    window.setTimeout(
      () => {
        busy.current = false
        if (idx + 1 >= order.length) finish(next, manual + (how === 'manual' ? 1 : 0))
        else setIdx((i) => i + 1)
      },
      ok ? 650 : 250,
    )
  }

  const voice = useVoiceJudge(target, () => answer(true, 'voice'))

  const finish = (res: Record<string, boolean>, manualCount: number) => {
    voice.stop()
    const missed = KANA.filter((k) => res[k] === false)
    const correct = KANA.length - missed.length
    const rec: AssessRecord = {
      id: String(Date.now()),
      date: new Date().toISOString(),
      name,
      correct,
      total: KANA.length,
      missed,
      manual: manualCount,
    }
    addRecord(rec)
    setRecords(loadRecords())
    setLast(rec)
    setPhase('result')
    window.setTimeout(() => sayVoice(remark(correct, KANA.length).voice), 500)
  }

  const goName = () => {
    setName('')
    setNameError(false)
    setPhase('name')
    window.setTimeout(() => sayVoice('assess_name'), 300)
  }

  const start = async () => {
    const n = name.trim()
    if (!HIRAGANA.test(n)) {
      setNameError(true)
      sayVoice('assess_name')
      return
    }
    setName(n)
    setOrder(smartShuffle(KANA.length, shuffle([...KANA])))
    setIdx(0)
    setResults({})
    setManual(0)
    busy.current = false
    await voice.start()
    // ずんだもんが話しているあいだは きかない（声を まちがえて合格にしないため）
    voice.hold(6000)
    setStarting(true)
    let begun = false
    const begin = () => {
      if (begun) return
      begun = true
      setStarting(false)
      setPhase('test')
    }
    sayVoice('assess_start', begin)
    window.setTimeout(begin, 6000) // 声が鳴らなかったときも はじめる
  }

  const quit = () => {
    voice.stop()
    setPhase('menu')
  }

  useEffect(() => () => voice.stop(), []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 px-3 pt-3 sm:px-5">
        <button type="button" onClick={phase === 'test' ? quit : onHome} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-amber-200 bg-white text-stone-600" aria-label={phase === 'test' ? 'やめる' : 'ホームへ'}>
          {phase === 'test' ? <X size={24} /> : <House size={24} />}
        </button>
        <h2 className="min-w-0 flex-1 truncate text-xl font-bold text-stone-800 sm:text-2xl">アセスメントモード</h2>
        {phase === 'test' && (
          <span className="rounded-full bg-white px-4 py-1.5 text-lg font-bold tabular-nums text-stone-700 shadow-sm">
            {idx + 1} / {order.length}
          </span>
        )}
      </header>

      {phase === 'menu' && (
        <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-5 overflow-y-auto px-4 py-4" style={{ touchAction: 'pan-y' }}>
          <section className="flex flex-col items-center gap-3 text-center">
            <p className="text-lg leading-relaxed text-stone-600">46文字を ランダムに 1文字ずつ よんで、ひらがなの 修得率を しらべます。</p>
            <ActionButton icon={<Play />} label="アセスメントを はじめる" onClick={goName} strong />
          </section>

          <section className="flex flex-col gap-3 rounded-3xl border-2 border-amber-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-stone-800">
                <ClipboardList size={20} /> 修得率の きろく
              </h3>
              {records.length > 0 &&
                (confirmReset ? (
                  <span className="flex items-center gap-2 text-sm">
                    <span className="text-red-700">ぜんぶ けしますか？</span>
                    <button
                      type="button"
                      onClick={() => {
                        clearRecords()
                        setRecords([])
                        setConfirmReset(false)
                      }}
                      className="rounded-full bg-red-600 px-3 py-1 font-bold text-white"
                    >
                      けす
                    </button>
                    <button type="button" onClick={() => setConfirmReset(false)} className="rounded-full border-2 border-stone-200 px-3 py-1 text-stone-600">
                      やめる
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmReset(true)} className="flex items-center gap-1 rounded-full border-2 border-stone-200 px-3 py-1 text-sm text-stone-600">
                    <Trash2 size={16} /> リセット
                  </button>
                ))}
            </div>
            {records.length === 0 ? (
              <p className="text-sm text-stone-500">まだ きろくは ありません。アセスメントを おえると、ここに 日付つきで のこります。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-stone-500">
                    <tr>
                      <th className="py-1 pr-3 font-normal">日付</th>
                      <th className="py-1 pr-3 font-normal">なまえ</th>
                      <th className="py-1 pr-3 text-right font-normal">よめた数</th>
                      <th className="py-1 pr-3 text-right font-normal">修得率</th>
                      <th className="py-1 font-normal">よめなかった文字</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums text-stone-800">
                    {records.map((r) => (
                      <tr key={r.id} className="border-t border-stone-100 align-top">
                        <td className="py-1.5 pr-3 whitespace-nowrap">{formatDate(r.date)}</td>
                        <td className="font-card py-1.5 pr-3">{r.name}</td>
                        <td className="py-1.5 pr-3 text-right">
                          {r.correct} / {r.total}
                        </td>
                        <td className="py-1.5 pr-3 text-right font-bold">{Math.round((r.correct / r.total) * 100)}%</td>
                        <td className="font-card py-1.5 tracking-wider">{r.missed.length ? r.missed.join(' ') : 'なし'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-stone-400">きろくは この端末の ブラウザの中だけに のこり、外には おくられません。</p>
          </section>
        </main>
      )}

      {phase === 'name' && (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
          <Mascot size={110} />
          <p className="text-2xl font-bold leading-relaxed text-stone-800">したの なまえを ひらがなで いれてね</p>
          <button type="button" onClick={() => sayVoice('assess_name')} className="flex items-center gap-1 text-stone-500 underline">
            <Volume2 size={18} /> もういちど きく
          </button>
          <input
            id="assess-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setNameError(false)
            }}
            onKeyDown={(e) => e.key === 'Enter' && void start()}
            placeholder="れい：はなこ"
            autoComplete="off"
            className="font-card w-full max-w-sm rounded-2xl border-4 border-amber-200 bg-white px-4 py-3 text-center text-3xl text-stone-900 outline-none focus:border-orange-400"
            style={{ touchAction: 'auto', userSelect: 'text', WebkitUserSelect: 'text' }}
          />
          {nameError && <p className="text-lg text-red-700">ひらがなだけで いれてね</p>}
          {starting ? (
            <p className="text-xl font-bold text-orange-600">ずんだもんの おはなしを きいてね</p>
          ) : (
            <ActionButton icon={<Play />} label="スタート" onClick={() => void start()} strong />
          )}
          <p className="text-sm text-stone-400">スタートを おすと マイクが つきます</p>
        </main>
      )}

      {phase === 'test' && target && (
        <>
          <main className="relative min-h-0 flex-1 px-4 py-3">
            <AnimatePresence mode="wait">
              <motion.div key={`${idx}-${target}`} className="mx-auto h-full w-full max-w-2xl" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                <Card char={target} variant="letter" />
              </motion.div>
            </AnimatePresence>
          </main>
          <footer className="flex flex-wrap items-center justify-center gap-3 px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <MicBadge status={voice.status} frame={voice.frame} error={voice.lastError()} onRetry={() => void voice.start()} heard={voice.heard} />
            <button type="button" onClick={() => answer(false, 'skip')} className="flex h-14 items-center gap-1 rounded-full border-2 border-stone-300 bg-white px-5 text-lg font-bold text-stone-600">
              <SkipForward size={20} /> よめない
            </button>
            <button type="button" onClick={() => answer(true, 'manual')} className="flex h-14 items-center gap-1 rounded-full border-2 border-amber-300 bg-white px-5 text-lg font-bold text-stone-700">
              <Check size={20} /> よめた（先生）
            </button>
          </footer>
        </>
      )}

      {phase === 'result' && last && (
        <main className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-4 py-4 text-center" style={{ touchAction: 'pan-y' }}>
          <Hanamaru size={140} />
          <p className="font-card text-2xl text-stone-700">{last.name} さん</p>
          <p className="text-5xl font-bold tabular-nums text-orange-500">
            {last.correct} <span className="text-2xl text-stone-500">/ {last.total} もじ</span>
          </p>
          <p className="text-lg text-stone-600">修得率 {Math.round((last.correct / last.total) * 100)}%</p>
          <p className="text-xl font-bold leading-relaxed text-stone-800">{remark(last.correct, last.total).text}</p>
          <Mascot size={90} mood="cheer" />
          {last.missed.length > 0 && (
            <p className="text-sm text-stone-500">
              よめなかった文字：<span className="font-card text-lg tracking-wider text-stone-700">{last.missed.join(' ')}</span>
            </p>
          )}
          {last.manual > 0 && <p className="text-xs text-stone-400">先生の「よめた」ボタンで○にした文字：{last.manual}こ</p>}
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <ActionButton label="きろくを みる" onClick={() => setPhase('menu')} />
            <ActionButton label="ホームへ" onClick={onHome} strong />
          </div>
        </main>
      )}

      <Confetti burst={burst} />
    </div>
  )
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
