/** アセスメントの記録（この端末のブラウザの中だけに保存） */
import { lsGet, lsSet } from './storage'

export interface AssessRecord {
  id: string
  date: string // ISO 日時
  name: string // したの なまえ（ひらがな）
  correct: number // よめた数
  total: number // 出題数（46）
  missed: string[] // よめなかった文字
  manual: number // 先生が「よめた」ボタンで○にした数
}

const KEY = 'yomemaru:assess'

export function loadRecords(): AssessRecord[] {
  try {
    const v = JSON.parse(lsGet(KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function addRecord(r: AssessRecord) {
  lsSet(KEY, JSON.stringify([r, ...loadRecords()]))
}

export function clearRecords() {
  lsSet(KEY, '[]')
}

export function formatDate(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 結果に応じたほめことば（どの結果も前向きに） */
export function remark(correct: number, total: number) {
  const r = correct / total
  if (correct === total) return { text: 'ぜんぶ よめたのだ！ ほんとうに すごいのだ！', voice: 'assess_r1' as const }
  if (r >= 0.75) return { text: 'たくさん よめたのだ！ すばらしいのだ！', voice: 'assess_r2' as const }
  if (r >= 0.4) return { text: 'よく がんばったのだ！ どんどん よめるように なっているのだ！', voice: 'assess_r3' as const }
  return { text: 'さいごまで よく がんばったのだ！ いっしょに れんしゅうするのだ！', voice: 'assess_r4' as const }
}
