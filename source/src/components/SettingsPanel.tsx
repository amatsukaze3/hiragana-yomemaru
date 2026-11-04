import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ImagePlus, RotateCcw, Type, X } from 'lucide-react'
import { KANA_INFO, ROWS, type Kana } from '../data/kana'
import { useCards } from '../lib/cards'
import { clearUserFont, detectFontStatus, registerUserFont, userFontName, type FontStatus } from '../lib/font'
import { lsGet, lsSet } from '../lib/storage'

export function useMeterSetting(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(() => lsGet('yomemaru:meter') === '1')
  return [on, (v) => (setOn(v), lsSet('yomemaru:meter', v ? '1' : '0'))]
}

/** 右上の「カード とうろく」パネル（保護者・先生向け） */
export function SettingsPanel({ open, onClose, meter, setMeter }: { open: boolean; onClose: () => void; meter: boolean; setMeter: (v: boolean) => void }) {
  const { art, setImage, setOverlay, reset } = useCards()
  const [fontStatus, setFontStatus] = useState<FontStatus>('checking')
  const [fontName, setFontName] = useState<string | null>(null)
  const [fontError, setFontError] = useState(false)
  const fileRefs = useRef<Partial<Record<Kana, HTMLInputElement | null>>>({})
  const fontRef = useRef<HTMLInputElement>(null)

  const refreshFont = async () => {
    setFontStatus(await detectFontStatus())
    setFontName(await userFontName())
  }
  useEffect(() => {
    if (open) void refreshFont()
  }, [open])

  const fontLabel =
    fontStatus === 'user'
      ? `登録したフォント（${fontName ?? ''}）を使っています`
      : fontStatus === 'system'
        ? 'この端末の UDデジタル教科書体 NK-B を使っています'
        : fontStatus === 'fallback'
          ? 'この端末に UDデジタル教科書体 NK-B が見つかりません。いまは教科書体風の Klee One で表示しています'
          : 'しらべています…'

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex justify-end bg-stone-900/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.aside
            className="flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto bg-stone-50 px-5 pb-8 pt-[max(20px,env(safe-area-inset-top))] shadow-2xl"
            style={{ touchAction: 'pan-y' }}
            initial={{ x: 60 }}
            animate={{ x: 0 }}
            exit={{ x: 60 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-stone-800">カード とうろく</h2>
              <button type="button" onClick={onClose} className="rounded-full p-2 text-stone-500 hover:bg-stone-200" aria-label="とじる">
                <X size={26} />
              </button>
            </header>
            <p className="text-sm leading-relaxed text-stone-500">
              手持ちのカード画像（PNG）を選ぶと、この端末に保存して差し替えます。画像はこの端末の中だけに残り、外には送られません。
            </p>

            <ul className="flex flex-col gap-3">
              {ROWS.flatMap((r) => r.kana).map((k) => {
                const a = art[k]
                return (
                  <li key={k} className="flex items-center gap-3 rounded-2xl border-2 border-amber-100 bg-white p-3">
                    <div className="relative flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-50">
                      <img src={a.url} alt="" className="max-h-full max-w-full object-contain" />
                      {a.overlay && <span className="font-card absolute text-2xl text-stone-900">{k}</span>}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="font-card text-2xl text-stone-900">{k}</span>
                        <span className="truncate text-sm text-stone-500">{a.custom ? '差し替え中' : `${KANA_INFO[k].word}（はじめの絵）`}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => fileRefs.current[k]?.click()}
                          className="flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-stone-900"
                        >
                          <ImagePlus size={16} /> 画像をえらぶ
                        </button>
                        <label className="flex items-center gap-1 text-sm text-stone-600">
                          <input id={`overlay-${k}`} type="checkbox" checked={a.overlay} onChange={(e) => void setOverlay(k, e.target.checked)} className="h-4 w-4 accent-orange-500" />
                          文字を重ねる
                        </label>
                        {a.custom && (
                          <button type="button" onClick={() => void reset(k)} className="flex items-center gap-1 text-sm text-stone-500 underline">
                            <RotateCcw size={14} /> もとにもどす
                          </button>
                        )}
                      </div>
                      <input
                        id={`file-${k}`}
                        ref={(el) => void (fileRefs.current[k] = el)}
                        type="file"
                        accept="image/png,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void setImage(k, f)
                          e.target.value = ''
                        }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>

            <section className="flex flex-col gap-2 rounded-2xl border-2 border-amber-100 bg-white p-4">
              <h3 className="flex items-center gap-2 font-bold text-stone-800">
                <Type size={18} /> カードの文字（UDデジタル教科書体 NK-B）
              </h3>
              <p className="text-sm leading-relaxed text-stone-600">{fontLabel}</p>
              <p className="text-xs leading-relaxed text-stone-400">
                iPad などで使うときは、ライセンスをお持ちのフォントファイル（.ttf / .otf）を登録してください。この端末にだけ保存されます。
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => fontRef.current?.click()} className="rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-stone-900">
                  フォントを登録
                </button>
                {fontStatus === 'user' && (
                  <button type="button" onClick={() => void clearUserFont().then(refreshFont)} className="text-sm text-stone-500 underline">
                    登録を消す
                  </button>
                )}
              </div>
              {fontError && <p className="text-sm text-red-600">このファイルはフォントとして読み込めませんでした。.ttf か .otf を選んでください。</p>}
              <input
                id="font-file"
                ref={fontRef}
                type="file"
                accept=".ttf,.otf,.ttc,.woff,.woff2,font/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f) return
                  const ok = await registerUserFont(f)
                  setFontError(!ok)
                  await refreshFont()
                }}
              />
            </section>

            <label className="flex items-center gap-3 rounded-2xl border-2 border-amber-100 bg-white p-4 text-sm text-stone-700">
              <input id="meter" type="checkbox" checked={meter} onChange={(e) => setMeter(e.target.checked)} className="h-5 w-5 accent-orange-500" />
              おんどくの画面に、声の帯域メーター（保護者向け）を出す
            </label>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
