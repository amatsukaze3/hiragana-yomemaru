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
// 11-24 の iPad の ようす：みじかい 1もじ（「は」）は とちゅうの けっかが でず、3かい よんで やっと「ははは」。声の 知らせ（soundstart など）も こない
const PARTIAL_MIN = Number(process.env.PARTIAL_MIN ?? 3) // とちゅうの けっかが でる のに いる もじの かず（とめれば すぐ でる）
const EVENTS = process.env.EVENTS === '1' // soundstart・speechstart を だす か（だす ときは 1かいの 音声認識で さいしょの 音の 1かい だけ）
const CHIME = process.env.CHIME === '1' // 合格の チャイムを マイクが ひろう（声の 知らせ だけ。ことばには ならない）
class MockRecog {
  lang = ''; continuous = true; interimResults = true; maxAlternatives = 1
  onresult: any = null; onend: any = null; onerror: any = null; onstart: any = null
  onsoundstart: any = null; onspeechstart: any = null; onspeechend: any = null; onsoundend: any = null
  running = false; readyAt = 0; heard: string[] = []; stopping = false; sounded = false
  /** きいた 声（よみおわった 時刻つき）。とめると、とめる まえに よみおわった ぶんが けっかに なる */
  audio: { kana: string; end: number }[] = []
  static all: MockRecog[] = []
  constructor() { MockRecog.all.push(this) }
  onaudiostart: any = null
  start() { if (this.running) throw new Error('already'); this.running = true; this.stopping = false; this.heard = []; this.audio = []; this.sounded = false; this.readyAt = simT + START_MS; setTimeout(() => this.onstart?.(), 50); setTimeout(() => this.running && this.onaudiostart?.(), START_MS - 50) }
  text() { let s = this.heard.join(''); for (const [k, v] of Object.entries(MERGE)) s = s.replace(k, v); return s }
  emit() { const t = this.text(); if (process.env.TRACE) console.log(simT, 'emit', t); if (!t) return; const r: any = [{ transcript: t }]; this.onresult?.({ resultIndex: 0, results: [r] }) }
  stop() {
    if (process.env.TRACE) console.log(simT, 'stop', this.audio.map((a) => a.kana + '@' + a.end).join(','))
    if (!this.running || this.stopping) return
    this.stopping = true
    const at = simT
    this.heard = this.audio.filter((a) => a.end <= at).map((a) => a.kana)
    setTimeout(() => { this.emit(); this.end() }, 120)
  }
  abort() { if (!this.running) return; this.stopping = true; setTimeout(() => this.end(), 30) }
  end() { this.running = false; this.stopping = false; this.onend?.() }
  /** 音が きこえた（さいしょの 1かい だけ 知らせ） */
  sound() {
    if (!this.running || this.stopping || simT < this.readyAt) return
    if (EVENTS && !this.sounded) { this.sounded = true; this.onsoundstart?.(); this.onspeechstart?.() }
  }
  /** こどもが よむ（きけて いれば、0.4びょう あとに とちゅうの けっか） */
  say(kana: string) {
    if (process.env.TRACE) console.log(simT, 'say', kana, this.running, this.stopping, simT >= this.readyAt)
    if (!this.running || this.stopping || simT < this.readyAt) return
    this.sound()
    this.audio.push({ kana, end: simT + 300 })
    setTimeout(() => { if (!this.running || this.stopping) return; this.heard = this.audio.filter((a) => a.end <= simT).map((a) => a.kana); if (this.heard.length >= PARTIAL_MIN) this.emit() }, 400)

  }
}
g.webkitSpeechRecognition = MockRecog

import { HybridVoiceJudge } from './engine_stub'
const HIRA: Record<string, string> = { ア: 'あ', イ: 'い', ウ: 'う', エ: 'え', オ: 'お', カ: 'か', キ: 'き', ク: 'く', ケ: 'け', コ: 'こ', サ: 'さ', シ: 'し', ス: 'す', セ: 'せ', ソ: 'そ' }
const rows = [['ア', 'イ', 'ウ', 'エ', 'オ'], ['カ', 'キ', 'ク', 'ケ', 'コ'], ['サ', 'シ', 'ス', 'セ', 'ソ']]
function shuffle<T>(a: T[], seed: number) { const r = [...a]; let s = seed; for (let i = r.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) % 2 ** 31; const j = s % (i + 1); [r[i], r[j]] = [r[j], r[i]] } return r }

const READ_AFTER = Number(process.env.READ_AFTER ?? 900) // 文字が でてから よむまで（ミリびょう。この 0.5〜1.5ばいで ばらつく）
let rs = 12345
const rnd = () => ((rs = (rs * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
let first = 0, total = 0, tries = 0, okN = 0
const ttp: number[] = []
for (let seed = 1; seed <= 20; seed++)
  for (const row of rows) {
    const j = new HybridVoiceJudge() as any
    if (process.env.WIN) j.listenWindowMs = Number(process.env.WIN)
    let passed = false
    let passAt = 0
    j.onPass = () => { passed = true; passAt = simT; if (process.env.TRACE) console.log(simT, 'PASS') }
    void j.start()
    runUntil(simT + 1000)
    for (const k of shuffle(row, seed)) {
      // おぼえる ステップ5：つぎの 文字が でる（setTarget、ロック 0.3びょう）
      if (process.env.TRACE) console.log(simT, 'TARGET', k)
      j.setTarget(k)
      passed = false
      let n = 0
      let t0 = simT
      const shownAt = simT
      while (!passed && n < 6) {
        // 1かいめは READ_AFTER の 0.5〜1.5ばい、よみなおしは 1.2〜2.0びょう あと
        runUntil(t0 + (n === 0 ? READ_AFTER * (0.5 + rnd()) : 0))
        n++
        MockRecog.all[MockRecog.all.length - 1] && [...MockRecog.all].reverse().find((r) => r.running)?.say(HIRA[k])
        runUntil(simT + 1200 + 800 * rnd())
        t0 = simT
      }
      total++; tries += n
      if (n === 1 && passed) first++
      if (passed) { okN++; ttp.push(passAt - shownAt) }
      // 合格：チャイム・hold(900)、0.7びょうで つぎの 文字
      if (CHIME) setTimeout(() => [...MockRecog.all].reverse().find((r) => r.running)?.sound(), 150)
      j.hold(900)
      runUntil(simT + 700)
    }
    j.stop()
  }
ttp.sort((a, b) => a - b)
console.log(`1かいめで 合格 ${first}/${total} (${((100 * first) / total).toFixed(0)}%)  よんだ かいすう へいきん ${(tries / total).toFixed(2)}  合格 ${okN}/${total}  合格までの 時間 中央 ${ttp[ttp.length >> 1]}ms・9わり ${ttp[Math.floor(ttp.length * 0.9)]}ms`)
