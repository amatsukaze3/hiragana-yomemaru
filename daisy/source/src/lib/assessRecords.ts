/** アセスメントの記録（この端末のブラウザの中だけに保存） */
import { lsGet, lsSet } from './storage'

export interface AssessRecord {
  id: string
  date: string // ISO 日時
  name: string // したの なまえ（ひらがな・カタカナ）
  correct: number // よめた数
  total: number // 出題数（46）
  missed: string[] // よめなかった文字
  manual: number // 先生が「よめた」ボタンで○にした数
  helped?: string[] // せんせいヘルプで合格にした文字（よめなかった文字として（ ）つきで記録）
  vowelMode?: boolean // せんせいメニューの「ぼおん ごうかく」（母音が あえば 合格）で しらべた
}

/** よめなかった文字の表示：せんせいヘルプで合格にした文字は（ ）でかこむ（50音順） */
export function missedLabel(r: AssessRecord, order: readonly string[]) {
  const helped = new Set(r.helped ?? [])
  const all = new Set([...r.missed, ...helped])
  const list = order.filter((k) => all.has(k)).map((k) => (helped.has(k) ? `（${k}）` : k))
  return list.length ? list.join(' ') : 'なし'
}

const KEY = 'daisy:assess'

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
  if (correct === total) return { text: 'You read all of them! Amazing!', voice: 'assess_r1' as const }
  if (r >= 0.75) return { text: 'You read so many! Great job!', voice: 'assess_r2' as const }
  if (r >= 0.4) return { text: "Good job! You're getting better and better!", voice: 'assess_r3' as const }
  return { text: "Nice try! Let's practice together!", voice: 'assess_r4' as const }
}
