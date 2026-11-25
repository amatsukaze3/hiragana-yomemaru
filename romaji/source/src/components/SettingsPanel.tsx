import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ImagePlus, RotateCcw, Type, X } from 'lucide-react'
import { KANA_INFO, ROWS, type Kana } from '../data/kana'
import { useCards } from '../lib/cards'
import { clearUserFont, detectFontStatus, registerUserFont, userFontName, type FontStatus } from '../lib/font'
import { lsGet, lsSet } from '../lib/storage'
import { clearVoiceprint, loadVoiceprint, voiceprintUseful } from '../lib/voiceprint'
import { formatDate } from '../lib/assessRecords'
import { VoiceRegister } from './VoiceRegister'
import { clearMastered, loadMastered } from '../lib/progress'
import { clearTeacherPin, hasTeacherPin } from './TeacherHelp'
import { cardRomaji, setRomajiStyle, useRomajiStyle, wordRomaji, type RomajiStyle } from '../lib/romaji'
import { JudgeLogPanel } from './JudgeLogPanel'

/** 先生の暗証番号を けす（わすれたとき）。子どもが 消さないよう、たし算に答えてもらう */
function PinReset() {
  const [has, setHas] = useState(hasTeacherPin)
  const [q] = useState(() => [12 + Math.floor(Math.random() * 30), 15 + Math.floor(Math.random() * 30)])
  const [ans, setAns] = useState('')
  return (
    <section className="flex flex-col gap-2 rounded-2xl border-2 border-amber-100 bg-white p-4 text-sm text-stone-700">
      <h3 className="text-base font-bold text-stone-800">先生用の暗証番号（せんせい ヘルプ）</h3>
      <p className="leading-relaxed text-stone-500">練習中の「せんせい」ボタン（一時停止・強制合格）で使う4けたの番号です。忘れたときは、ここで消すと、次に押したときに 決めなおせます。</p>
      {has ? (
        <div className="flex flex-wrap items-center gap-2">
          <span>
            {q[0]} + {q[1]} =
          </span>
          <input value={ans} onChange={(e) => setAns(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="w-20 rounded-lg border-2 border-stone-200 px-2 py-1 text-base" aria-label="こたえ" />
          <button
            type="button"
            disabled={Number(ans) !== q[0] + q[1]}
            onClick={() => {
              clearTeacherPin()
              setHas(false)
            }}
            className="rounded-full border-2 border-stone-200 px-4 py-1.5 text-stone-600 disabled:opacity-40"
          >
            暗証番号を 消す
          </button>
        </div>
      ) : (
        <p className="text-stone-600">まだ 決めていません（はじめて「せんせい」ボタンを押したときに 決めます）</p>
      )}
    </section>
  )
}

/** 「よめたよ バー」の きろくを けす（使う子が かわったとき） */
function ProgressReset() {
  const [n, setN] = useState(() => loadMastered().size)
  const [ask, setAsk] = useState(false)
  return (
    <section className="flex flex-col gap-2 rounded-2xl border-2 border-amber-100 bg-white p-4 text-sm text-stone-700">
      <h3 className="text-base font-bold text-stone-800">よめたよ バー の きろく</h3>
      <p className="leading-relaxed text-stone-500">「おぼえる」のステップ5で、マイクで読めた文字を記録しています（この端末の中だけ）。46文字そろうと「フローラちゃんシューティング」が出ます。</p>
      <p className="text-stone-600">いま {n} / 46 もじ</p>
      {ask ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-rose-600">ほんとうに けしますか？</span>
          <button
            type="button"
            onClick={() => {
              clearMastered()
              setN(0)
              setAsk(false)
              location.reload()
            }}
            className="rounded-full bg-rose-500 px-4 py-1.5 font-bold text-white"
          >
            けす
          </button>
          <button type="button" onClick={() => setAsk(false)} className="rounded-full border-2 border-stone-200 px-4 py-1.5 text-stone-600">
            やめる
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setAsk(true)} disabled={n === 0} className="self-start rounded-full border-2 border-stone-200 px-4 py-1.5 text-stone-600 disabled:opacity-40">
          きろくを けす
        </button>
      )}
    </section>
  )
}

/** ローマ字の つづり方（あたらしい ローマ字 ／ 訓令式 ／ りょうほう） */
function SpellingStyle() {
  const st = useRomajiStyle()
  const opts: { id: RomajiStyle; label: string; ex: string }[] = [
    { id: 'new', label: 'あたらしい ローマ字（ヘボン式が もと）', ex: 'shi・chi・tsu・fu' },
    { id: 'kunrei', label: '訓令式', ex: 'si・ti・tu・hu' },
    { id: 'both', label: 'りょうほう（訓令式を 小さく そえる）', ex: 'shi（si）' },
  ]
  return (
    <section className="flex flex-col gap-2 rounded-2xl border-2 border-violet-200 bg-white p-4 text-sm text-stone-700">
      <h3 className="text-base font-bold text-stone-800">ローマ字の つづり方</h3>
      <p className="leading-relaxed text-stone-500">
        はじめは 令和7年の 内閣告示「ローマ字のつづり方」（ヘボン式が もと）です。前の 教科書で 訓令式を ならっている子は 訓令式に できます。
        のばす音は かなの とおりに 母音字を ならべます（{wordRomaji('こおり', st)}・{wordRomaji('そうじき', st)}）。「を」は 1文字の カードでは wo、ことばの 中では o です。
      </p>
      <div className="flex flex-col gap-1.5">
        {opts.map((o) => (
          <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 ${st === o.id ? 'border-violet-400 bg-violet-50' : 'border-stone-200'}`}>
            <input type="radio" name="romaji-style" checked={st === o.id} onChange={() => setRomajiStyle(o.id)} className="h-4 w-4 accent-violet-500" />
            <span className="flex-1">{o.label}</span>
            <span className="font-roma text-base text-stone-500">{o.ex}</span>
          </label>
        ))}
      </div>
    </section>
  )
}

export function useMeterSetting(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(() => lsGet('flora:meter') === '1')
  return [on, (v) => (setOn(v), lsSet('flora:meter', v ? '1' : '0'))]
}

/** 右上の「カードの とうろく／ことばの せってい」パネル（保護者・先生向け） */
export function SettingsPanel({ open, onClose, meter, setMeter }: { open: boolean; onClose: () => void; meter: boolean; setMeter: (v: boolean) => void }) {
  const { art, setImage, setOverlay, reset } = useCards()
  const [fontStatus, setFontStatus] = useState<FontStatus>('checking')
  const [fontName, setFontName] = useState<string | null>(null)
  const [fontError, setFontError] = useState(false)
  const fileRefs = useRef<Partial<Record<Kana, HTMLInputElement | null>>>({})
  const fontRef = useRef<HTMLInputElement>(null)
  const [registering, setRegistering] = useState(false)
  const [print, setPrint] = useState(loadVoiceprint)

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
              <h2 className="text-xl font-bold leading-snug text-stone-800">
                カードの とうろく
                <br />
                ことばの せってい
              </h2>
              <button type="button" onClick={onClose} className="rounded-full p-2 text-stone-500 hover:bg-stone-200" aria-label="とじる">
                <X size={26} />
              </button>
            </header>

            <SpellingStyle />
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
                      {a.overlay && <span className="font-roma absolute text-2xl text-stone-900">{cardRomaji(k)}</span>}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="font-roma text-2xl text-stone-900">{cardRomaji(k)}</span>
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
                          <input id={`overlay-${k}`} type="checkbox" checked={a.overlay} onChange={(e) => void setOverlay(k, e.target.checked)} className="h-4 w-4 accent-violet-500" />
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

            <ProgressReset />
            <PinReset />

            {voiceprintUseful() && (
              <section className="flex flex-col gap-2 rounded-2xl border-2 border-amber-100 bg-white p-4 text-sm text-stone-700">
                <h3 className="text-base font-bold text-stone-800">こえの とうろく</h3>
                <p className="leading-relaxed text-stone-500">
                  つかう子の「ア・イ・ウ・エ・オ・ン」を とうろくすると、その子の声に あわせて 母音を 判定します（iPad・iPhone は 母音と ん の カードだけ。子音の ある カードは 音声認識で 判定します。せんせいメニューで「ぼおん ごうかく」に した ときは、どの カードも この とうろくで 判定します）。つかう子が かわったら、とうろくしなおしてください。
                </p>
                <p className="text-stone-600">{print ? `とうろくずみ（${print.name ? `${print.name} さん・` : ''}${formatDate(print.date)}）` : 'まだ とうろくしていません'}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setRegistering(true)} className="rounded-full bg-amber-400 px-4 py-1.5 font-bold text-stone-900">
                    {print ? 'とうろくしなおす' : 'とうろくする'}
                  </button>
                  {print && (
                    <button
                      type="button"
                      onClick={() => {
                        clearVoiceprint()
                        setPrint(null)
                      }}
                      className="rounded-full border-2 border-stone-200 px-4 py-1.5 text-stone-600"
                    >
                      けす
                    </button>
                  )}
                </div>
              </section>
            )}

            <JudgeLogPanel />

            <label className="flex items-center gap-3 rounded-2xl border-2 border-amber-100 bg-white p-4 text-sm text-stone-700">
              <input id="meter" type="checkbox" checked={meter} onChange={(e) => setMeter(e.target.checked)} className="h-5 w-5 accent-violet-500" />
              おんどくの画面に、声の帯域メーター（保護者向け）を出す
            </label>
          </motion.aside>
        </motion.div>
      )}
      {registering && (
        <VoiceRegister
          key="register"
          onCancel={() => setRegistering(false)}
          onDone={() => {
            setRegistering(false)
            setPrint(loadVoiceprint())
          }}
        />
      )}
    </AnimatePresence>
  )
}
