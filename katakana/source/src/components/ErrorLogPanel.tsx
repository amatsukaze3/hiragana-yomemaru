import { useState } from 'react'
import { AlertCircle, Trash2, X } from 'lucide-react'
import { formatDate } from '../lib/assessRecords'
import { KIND_LABEL, SOURCE_LABEL, batchiriTargets, clearErrorFor, clearErrorLog, loadErrorLog, rankedErrors, type ErrorLog } from '../lib/errorLog'
import { BATCHIRI_DAY, batchiriForced, loginDayCount, setBatchiriForced } from '../lib/loginDays'
import type { Kana } from '../data/kana'

const RECENT_SHOWN = 50

/**
 * まちがいログ（アセスメントモードの メニューに だす）
 * シューティング・アセスメント・これで ばっちり モード で「まちがえた」「よめなかった」もじの きろく。
 * 「これで ばっちり モード」は ここの 上位 3もじを だす。
 */
export function ErrorLogPanel() {
  const [log, setLog] = useState<ErrorLog>(loadErrorLog)
  const [confirmAll, setConfirmAll] = useState(false)
  const [confirmK, setConfirmK] = useState<Kana | null>(null)
  const [showRecent, setShowRecent] = useState(false)
  const [forced, setForced] = useState(batchiriForced)
  const rows = rankedErrors(log)
  const picks = new Set(batchiriTargets(3, log))
  const days = loginDayCount()
  const reload = () => setLog(loadErrorLog())

  return (
    <section className="flex flex-col gap-3 rounded-3xl border-2 border-violet-100 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-bold text-stone-800">
          <AlertCircle size={20} className="text-violet-500" /> まちがいログ
        </h3>
        {rows.length > 0 &&
          (confirmAll ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-red-700">ログを ぜんぶ けしますか？</span>
              <button
                type="button"
                onClick={() => {
                  clearErrorLog()
                  reload()
                  setConfirmAll(false)
                }}
                className="rounded-full bg-red-600 px-3 py-1 font-bold text-white"
              >
                けす
              </button>
              <button type="button" onClick={() => setConfirmAll(false)} className="rounded-full border-2 border-stone-200 px-3 py-1 text-stone-600">
                やめる
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmAll(true)} className="flex items-center gap-1 rounded-full border-2 border-stone-200 px-3 py-1 text-sm text-stone-600">
              <Trash2 size={16} /> ログを ぜんぶ けす
            </button>
          ))}
      </div>

      <p className="text-sm leading-relaxed text-stone-600">
        シューティング・アセスメント・これで ばっちり モードで、<b>まちがえた</b>（こえに だして よんだが ちがう よみと はんてい）・<b>よめなかった</b>
        （カードを おとした／「よめない」／せんせいヘルプで ごうかく）もじを、けすまで ずっと あつめます。
        <b>「これで ばっちり モード」</b>は、はじめる たびに <b>いまの にがて度</b> の 上位 3もじを だします。にがて度は まちがえると ふえ、
        マイクで ただしく よめたり・カンペキテストを クリアしたり・じかんが たったり（2しゅうかんで はんぶん）すると へるので、よめるように なった もじは しだいに でなくなります。
      </p>

      {/* ログイン日数 と ばっちりモードの でてくる ひ */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-violet-50 px-3 py-2 text-sm text-stone-700">
        <span>
          あそんだ日：<b className="tabular-nums">{days}</b> 日
        </span>
        <span>
          これで ばっちり モード：
          {forced || days >= BATCHIRI_DAY ? <b className="text-violet-700">でています</b> : <span>{BATCHIRI_DAY}日目から でます（あと {BATCHIRI_DAY - days}日）</span>}
        </span>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={forced}
            onChange={(e) => {
              setBatchiriForced(e.target.checked)
              setForced(e.target.checked)
            }}
            className="h-4 w-4 accent-violet-600"
          />
          すぐに だす（せんせい用）
        </label>
        <span className="text-xs text-stone-400">ログの きろく開始：{formatDate(new Date(log.since).toISOString())}</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">まだ まちがいの きろくは ありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                <th className="py-1 pr-3 font-normal">じゅんい</th>
                <th className="py-1 pr-3 font-normal">もじ</th>
                <th className="py-1 pr-3 text-right font-normal">まちがえた</th>
                <th className="py-1 pr-3 text-right font-normal">よめなかった</th>
                <th className="py-1 pr-3 text-right font-normal">ごうけい</th>
                <th className="py-1 pr-3 text-right font-normal">いまの にがて度</th>
                <th className="py-1 pr-3 font-normal">さいご</th>
                <th className="py-1 font-normal" />
              </tr>
            </thead>
            <tbody className="tabular-nums text-stone-800">
              {rows.map((r, i) => (
                <tr key={r.k} className={`border-t border-stone-100 ${picks.has(r.k) ? 'bg-violet-50/70' : ''}`}>
                  <td className="py-1.5 pr-3">
                    {i + 1}
                    {picks.has(r.k) && <span className="ml-1.5 whitespace-nowrap rounded-full bg-violet-500 px-2 py-0.5 text-xs font-bold text-white">ばっちりで でる</span>}
                  </td>
                  <td className="font-card py-1.5 pr-3 text-2xl leading-none">{r.k}</td>
                  <td className="py-1.5 pr-3 text-right">{r.w}</td>
                  <td className="py-1.5 pr-3 text-right">{r.u}</td>
                  <td className="py-1.5 pr-3 text-right">{r.total}</td>
                  <td className="py-1.5 pr-3 text-right font-bold">{r.weak.toFixed(1)}</td>
                  <td className="whitespace-nowrap py-1.5 pr-3 text-stone-500">{formatDate(new Date(r.last).toISOString())}</td>
                  <td className="py-1.5 text-right">
                    {confirmK === r.k ? (
                      <span className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            clearErrorFor(r.k)
                            reload()
                            setConfirmK(null)
                          }}
                          className="whitespace-nowrap rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white"
                        >
                          「{r.k}」を けす
                        </button>
                        <button type="button" onClick={() => setConfirmK(null)} className="rounded-full border border-stone-200 px-2 py-0.5 text-xs text-stone-600">
                          やめる
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmK(r.k)} className="rounded-full p-1 text-stone-400 hover:text-red-600" aria-label={`「${r.k}」の ログを けす`}>
                        <X size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {log.recent.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowRecent((v) => !v)} className="text-sm text-violet-700 underline underline-offset-2">
            {showRecent ? 'さいきんの きろくを とじる' : `さいきんの きろくを みる（${Math.min(RECENT_SHOWN, log.recent.length)}けん）`}
          </button>
          {showRecent && (
            <ul className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-stone-100 text-sm" style={{ touchAction: 'pan-y' }}>
              {log.recent.slice(0, RECENT_SHOWN).map((e, i) => (
                <li key={`${e.t}-${i}`} className="flex items-center gap-3 border-b border-stone-50 px-3 py-1 tabular-nums">
                  <span className="w-32 shrink-0 text-stone-500">{formatDate(new Date(e.t).toISOString())}</span>
                  <span className="font-card w-8 text-xl leading-none">{e.k}</span>
                  <span className={e.y === 'w' ? 'text-orange-700' : 'text-sky-700'}>{KIND_LABEL[e.y === 'w' ? 'wrong' : 'unread']}</span>
                  <span className="text-stone-400">{SOURCE_LABEL[e.s]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="text-xs text-stone-400">ログは この端末の ブラウザの中だけに のこり、外には おくられません。</p>
    </section>
  )
}
