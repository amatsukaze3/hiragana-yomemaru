// iPhone・iPad の 判定（Apple の 音声認識だけ）を まねて、1かいめで 合格するかを みる（会話の 中の 調査用）
// Apple の 音声認識は つづけて よむと まえの 文字と つなげて ことばに かきかえる（か＋き →「柿」）と して まねる
let simT = 0
type Ev = { t: number; f: () => void; id: number }
let evs: Ev[] = []
let nid = 1
const g = globalThis as any
g.performance = { now: () => simT }
g.window = globalThis
Object.defineProperty(g, 'navigator', { value: { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', maxTouchPoints: 5 }, configurable: true })
g.setTimeout = (f: () => void, ms = 0) => { const id = nid++; evs.push({ t: simT + Math.max(0, ms), f, id }); return id }
g.clearTimeout = (id: number) => { evs = evs.filter((e) => e.id !== id) }
g.setInterval = () => 0
g.clearInterval = () => {}
function runUntil(t: number) {
  for (;;) {
    evs.sort((a, b) => a.t - b.t || a.id - b.id)
    const e = evs[0]
    if (!e || e.t > t) break
    evs.shift(); simT = e.t; e.f()
  }
  simT = t
}

// つなげると ことばに なる もの（Apple の 音声認識が かきかえる）
const MERGE: Record<string, string> = { かき: '柿', すし: '寿司', あい: '愛', うえ: '上', いえ: '家', かこ: '過去', くき: '茎', さけ: '酒', そこ: '底', せき: '席', けさ: '今朝', こけ: '苔', えき: '駅', おい: '甥', きく: '菊', しお: '塩', あき: '秋', いけ: '池', かさ: '傘', くさ: '草', うし: '牛', あさ: '朝', いす: '椅子' }
const START_MS = Number(process.env.START_MS ?? 300) // start() してから きけるように なるまで
class MockRecog {
  lang = ''; continuous = true; interimResults = true; maxAlternatives = 1
  onresult: any = null; onend: any = null; onerror: any = null; onstart: any = null
  onsoundstart: any = null; onspeechstart: any = null; onspeechend: any = null; onsoundend: any = null
  running = false; readyAt = 0; heard: string[] = []; stopping = false
  static all: MockRecog[] = []
  constructor() { MockRecog.all.push(this) }
  start() { if (this.running) throw new Error('already'); this.running = true; this.stopping = false; this.heard = []; this.readyAt = simT + START_MS; setTimeout(() => this.onstart?.(), 50) }
  text() { let s = this.heard.join(''); for (const [k, v] of Object.entries(MERGE)) s = s.replace(k, v); return s }
  emit() { const t = this.text(); if (!t) return; const r: any = [{ transcript: t }]; this.onresult?.({ resultIndex: 0, results: [r] }) }
  stop() { if (!this.running || this.stopping) return; this.stopping = true; setTimeout(() => { this.emit(); this.end() }, 120) }
  abort() { if (!this.running) return; this.stopping = true; setTimeout(() => this.end(), 30) }
  end() { this.running = false; this.stopping = false; this.onend?.() }
  /** こどもが よむ（きけて いれば、0.4びょう あとに とちゅうの けっか） */
  say(kana: string) {
    if (!this.running || this.stopping || simT < this.readyAt) return
    this.onsoundstart?.(); this.onspeechstart?.()
    setTimeout(() => { if (!this.running || this.stopping) return; this.heard.push(kana); this.emit() }, 400)
    setTimeout(() => { this.onspeechend?.(); this.onsoundend?.() }, 600)
  }
}
g.webkitSpeechRecognition = MockRecog

import { HybridVoiceJudge } from '../../source/src/lib/voice'
const HIRA: Record<string, string> = { ア: 'あ', イ: 'い', ウ: 'う', エ: 'え', オ: 'お', カ: 'か', キ: 'き', ク: 'く', ケ: 'け', コ: 'こ', サ: 'さ', シ: 'し', ス: 'す', セ: 'せ', ソ: 'そ' }
const rows = [['ア', 'イ', 'ウ', 'エ', 'オ'], ['カ', 'キ', 'ク', 'ケ', 'コ'], ['サ', 'シ', 'ス', 'セ', 'ソ']]
function shuffle<T>(a: T[], seed: number) { const r = [...a]; let s = seed; for (let i = r.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) % 2 ** 31; const j = s % (i + 1); [r[i], r[j]] = [r[j], r[i]] } return r }

const READ_AFTER = Number(process.env.READ_AFTER ?? 900) // 文字が でてから よむまで（ミリびょう）
let first = 0, total = 0, tries = 0
for (let seed = 1; seed <= 20; seed++)
  for (const row of rows) {
    const j = new HybridVoiceJudge() as any
    let passed = false
    j.onPass = () => (passed = true)
    void j.start()
    runUntil(simT + 1000)
    for (const k of shuffle(row, seed)) {
      // おぼえる ステップ5：つぎの 文字が でる（setTarget、ロック 0.3びょう）
      j.setTarget(k)
      passed = false
      let n = 0
      let t0 = simT
      while (!passed && n < 5) {
        runUntil(t0 + READ_AFTER)
        n++
        MockRecog.all[MockRecog.all.length - 1] && [...MockRecog.all].reverse().find((r) => r.running)?.say(HIRA[k])
        runUntil(simT + 1500)
        t0 = simT
      }
      total++; tries += n
      if (n === 1 && passed) first++
      // 合格：チャイム・hold(900)、0.7びょうで つぎの 文字
      j.hold(900)
      runUntil(simT + 700)
    }
    j.stop()
  }
console.log(`1かいめで 合格 ${first}/${total} (${((100 * first) / total).toFixed(0)}%)  よんだ かいすう へいきん ${(tries / total).toFixed(2)}`)
