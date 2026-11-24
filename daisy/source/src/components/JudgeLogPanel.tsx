import { useState } from 'react'
import { ClipboardCopy, ScrollText, Trash2 } from 'lucide-react'
import { clearJudgeLog, formatLog, loadJudgeLog, passMode } from '../lib/voice'

/**
 * 判定の きろく（せんせい用）：音声認識が なんと きいたか・どの みちで 合格したか を のこす。
 * 「ら行が とおらない」などの ときに コピーして おくって もらうと、なおす 手がかりに なる（声そのものは のこさない）
 */
export function JudgeLogPanel() {
  const [items, setItems] = useState(loadJudgeLog)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const env = () => `${navigator.userAgent}\n${new Date().toLocaleString('ja-JP')}\nごうかくの きじゅん：${passMode.get() === 'vowel' ? 'ぼおん ごうかく' : 'しおん ごうかく'}`
  const copy = async () => {
    const text = formatLog(items, env())
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // クリップボードが つかえない ブラウザ：えらんで コピー できる ように ひらく
      setOpen(true)
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }
  const recent = items.slice(-40).reverse()
  return (
    <section className="flex flex-col gap-2 rounded-2xl border-2 border-amber-100 bg-white p-4 text-sm text-stone-700">
      <h3 className="flex items-center gap-2 text-base font-bold text-stone-800">
        <ScrollText size={18} /> 判定の きろく（{items.length}）
      </h3>
      <p className="leading-relaxed text-stone-500">
        マイクで よんだ ときに、音声認識が なんと きいたか・どの しくみで 合格したか の きろくです（声そのものは のこしません）。「ら行が とおりにくい」などの ときは「コピー」して おしらせください。
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void copy()} disabled={!items.length} className="flex items-center gap-1 rounded-full border-2 border-amber-300 bg-white px-3 py-1.5 font-bold text-stone-700 disabled:opacity-40">
          <ClipboardCopy size={16} /> {copied ? 'コピーしました' : 'コピー'}
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} disabled={!items.length} className="rounded-full border-2 border-stone-200 px-3 py-1.5 text-stone-600 disabled:opacity-40">
          {open ? 'とじる' : 'みる'}
        </button>
        <button
          type="button"
          onClick={() => {
            clearJudgeLog()
            setItems([])
          }}
          disabled={!items.length}
          className="flex items-center gap-1 rounded-full border-2 border-stone-200 px-3 py-1.5 text-stone-600 disabled:opacity-40"
        >
          <Trash2 size={16} /> けす
        </button>
      </div>
      {open && (
        <textarea readOnly value={formatLog(recent)} className="h-48 w-full rounded-xl border-2 border-stone-200 p-2 font-mono text-xs leading-snug text-stone-600" onFocus={(e) => e.currentTarget.select()} />
      )}
    </section>
  )
}
