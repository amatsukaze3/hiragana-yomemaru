/**
 * 判定の きろく（せんせい用）。どの 文字を、音声認識が なんと きき、周波数解析が どう みて、
 * どの みちで 合格した（しなかった）かを のこす。せってい の「判定の きろく」から コピーして
 * おくって もらえば、つぎの なおしの 手がかりに なる（こどもの 声そのものは のこさない）。
 */

export interface JudgeLogEntry {
  /** 時刻（ミリびょう、Date.now） */
  at: number
  /** 'asr'：音声認識の けっか、'utt'：周波数解析の 1つの 発声、'pass'：合格、'miss'：合格しなかった、'info'：そのほか */
  type: 'asr' | 'utt' | 'pass' | 'miss' | 'info'
  /** ねらって いた 文字（いちばん めの 目標） */
  target?: string | null
  /** 音声認識の こうほ（いちばん から） */
  alts?: string[]
  final?: boolean
  /** きいた ものの わけかた（match・variant・vowel・other …） */
  kind?: string
  /** 合格の みち（asr・variant・fuse・onset・vowel・n） */
  route?: string
  /** 周波数解析：母音が あったか・出だしの なかま と スコア */
  vowelOk?: boolean
  onset?: string
  ms?: number
  note?: string
}

const MAX = 300

export class JudgeLog {
  private items: JudgeLogEntry[] = []
  private key: string | null
  constructor(key: string | null) {
    this.key = key
    if (!key) return
    try {
      const raw = localStorage.getItem(key)
      if (raw) this.items = (JSON.parse(raw) as JudgeLogEntry[]).slice(-MAX)
    } catch {
      /* noop */
    }
  }
  private saveTimer = 0
  add(e: Omit<JudgeLogEntry, 'at'>) {
    this.items.push({ at: Date.now(), ...e })
    if (this.items.length > MAX) this.items.splice(0, this.items.length - MAX)
    if (!this.key || typeof window === 'undefined') return
    // まとめて ほぞん（1びょうに 1かい）
    if (!this.saveTimer)
      this.saveTimer = window.setTimeout(() => {
        this.saveTimer = 0
        try {
          localStorage.setItem(this.key!, JSON.stringify(this.items))
        } catch {
          /* noop */
        }
      }, 1000)
  }
  list() {
    return [...this.items]
  }
  clear() {
    this.items = []
    try {
      if (this.key) localStorage.removeItem(this.key)
    } catch {
      /* noop */
    }
  }
}

/** せんせいに みせる 1ぎょう（コピー用の テキスト） */
export function formatLog(items: JudgeLogEntry[], env = ''): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const lines = items.map((e) => {
    const d = new Date(e.at)
    const t = `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    const parts = [t, e.type.padEnd(4), e.target ?? '-']
    if (e.alts?.length) parts.push(`「${e.alts.join('／')}」${e.final ? '(final)' : ''}`)
    if (e.kind) parts.push(e.kind)
    if (e.route) parts.push(`route=${e.route}`)
    if (e.vowelOk !== undefined) parts.push(`vowel=${e.vowelOk ? 'ok' : 'no'}`)
    if (e.onset) parts.push(`onset=${e.onset}`)
    if (e.ms !== undefined) parts.push(`${Math.round(e.ms)}ms`)
    if (e.note) parts.push(e.note)
    return parts.join(' ')
  })
  return (env ? env + '\n' : '') + lines.join('\n')
}
