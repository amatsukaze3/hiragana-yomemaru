// iPad の ぼおん ごうかく：こえの とうろく が あれば 子音の カードも 周波数解析で きく／もどすと 音声認識に もどる。
// node build.mjs ios_vowelmode && node /tmp/judge_ios_vowelmode.mjs
let simT = 0
type Ev = { t: number; f: () => void; id: number }
let evs: Ev[] = []
let nid = 1
const g = globalThis as any
g.performance = { now: () => simT }
g.window = globalThis
g.setTimeout = (f: () => void, ms = 0) => { const id = nid++; evs.push({ t: simT + Math.max(0, ms), f, id }); return id }
g.clearTimeout = (id: number) => { evs = evs.filter((e) => e.id !== id) }
const ivs = new Set<number>()
g.setInterval = (f: () => void, ms: number) => { const id = nid++; ivs.add(id); const loop = () => { if (!ivs.has(id)) return; f(); g.setTimeout(loop, ms) }; g.setTimeout(loop, ms); return id }
g.clearInterval = (id: number) => { ivs.delete(id) }
const flush = () => new Promise<void>((r) => setImmediate(r))
async function runUntil(t: number) {
  for (;;) {
    await flush()
    evs.sort((a, b) => a.t - b.t || a.id - b.id)
    const e = evs[0]
    if (!e || e.t > t) break
    evs.shift(); simT = e.t; e.f()
  }
  simT = t
  await flush()
}
const GUM_MS = Number(process.env.GUM_MS ?? 300)
let gumCalls = 0, openStreams = 0
Object.defineProperty(g, 'navigator', { value: { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', maxTouchPoints: 5, mediaDevices: { getUserMedia: () => { gumCalls++; return new Promise((r) => setTimeout(() => { openStreams++; r({ getTracks: () => [{ stop: () => openStreams-- }] }) }, GUM_MS)) } } }, configurable: true })
const START_MS = 400
class MockRecog {
  lang = ''; continuous = true; interimResults = true; maxAlternatives = 1
  onresult: any = null; onend: any = null; onerror: any = null; onstart: any = null; onaudiostart: any = null
  onsoundstart: any = null; onspeechstart: any = null; onspeechend: any = null; onsoundend: any = null
  running = false; readyAt = 0; stopping = false; audio: { kana: string; end: number }[] = []; sounded = false
  static all: MockRecog[] = []
  constructor() { MockRecog.all.push(this) }
  start() { if (this.running) throw new Error('already'); this.running = true; this.stopping = false; this.audio = []; this.sounded = false; this.readyAt = simT + START_MS; setTimeout(() => this.onstart?.(), 50); setTimeout(() => this.running && this.onaudiostart?.(), START_MS - 50) }
  emit(t: string) { if (t) this.onresult?.({ resultIndex: 0, results: [[{ transcript: t }]] }) }
  stop() { if (!this.running || this.stopping) return; this.stopping = true; const at = simT; const t = this.audio.filter((a) => a.end <= at).map((a) => a.kana).join(''); setTimeout(() => { this.emit(t); this.end() }, 120) }
  abort() { if (!this.running) return; this.stopping = true; setTimeout(() => this.end(), 30) }
  end() { if (!this.running) return; this.running = false; this.stopping = false; this.onend?.() }
  say(kana: string) {
    if (!this.running || this.stopping || simT < this.readyAt) return false
    if (!this.sounded) { this.sounded = true; this.onsoundstart?.(); this.onspeechstart?.() }
    this.audio.push({ kana, end: simT + 300 })
    return true
  }
}
g.webkitSpeechRecognition = MockRecog
import { HybridVoiceJudge } from './engine_stub'
let fail = 0, n = 0
function check(name: string, ok: boolean) { n++; if (!ok) { fail++; console.log('NG', name) } }
const vp = [0, 1, 2, 3, 4, 5].map((i) => new Array(40).fill(0).map((_, k) => (k === i ? 1 : 0)))
const mode = (j: any) => (j.acoustic ? 'acoustic' : j.asrOnly ? 'asr' : j.running ? 'other' : 'stopped')
;(async () => {
  // 1. とうろく あり・ぼおん ごうかく で はじめる → 子音の カードも 周波数解析
  {
    const j = new HybridVoiceJudge('hira') as any
    j.setVoiceprint(vp)
    j.setVowelMode(true)
    j.setTarget('か')
    void j.start()
    await runUntil(simT + 1500)
    check(`とうろく あり・ぼおん：か は 周波数解析（${mode(j)}）`, mode(j) === 'acoustic')
    check('とうろく あり・ぼおん：きける', j.canHear())
    // つぎの カード（子音 → 子音）：きりかえない
    const g0 = gumCalls
    j.setTarget('さ')
    await runUntil(simT + 1500)
    check(`さ も 周波数解析・マイクを ひらきなおさない（${mode(j)}・${gumCalls - g0}）`, mode(j) === 'acoustic' && gumCalls === g0)
    // 2. とちゅうで しおん ごうかく に もどす → 音声認識
    j.setVowelMode(false)
    await runUntil(simT + 1500)
    check(`しおん に もどす：さ は 音声認識（${mode(j)}）`, mode(j) === 'asr')
    // 3. また ぼおん に → 周波数解析
    j.setVowelMode(true)
    await runUntil(simT + 1500)
    check(`また ぼおん：さ は 周波数解析（${mode(j)}）`, mode(j) === 'acoustic')
    // 4. ん（ん の とうろく あり）・あ も 周波数解析の まま
    j.setTarget('ん')
    await runUntil(simT + 1500)
    check(`ん も 周波数解析（${mode(j)}）`, mode(j) === 'acoustic')
    j.stop()
    await runUntil(simT + 300)
    check(`マイクが のこらない（${openStreams}）`, openStreams === 0)
  }
  // 5. とうろく なし：ぼおん ごうかく でも 音声認識（「か」に「あ」で 合格）
  {
    const j = new HybridVoiceJudge('hira') as any
    let passed: string | null = null
    j.onPass = (_s: string, k: string) => (passed = k)
    j.setVowelMode(true)
    void j.start()
    await runUntil(simT + 800)
    j.setTarget('か')
    await runUntil(simT + 1000)
    check(`とうろく なし・ぼおん：音声認識（${mode(j)}）`, mode(j) === 'asr')
    ;[...MockRecog.all].reverse().find((r) => r.running)?.say('あ')
    await runUntil(simT + 2500)
    check(`とうろく なし・ぼおん：か ← あ で 合格（${passed}）`, passed === 'か')
    j.stop()
    await runUntil(simT + 300)
  }
  // 6. しおん ごうかく（とうろく あり）：子音の カードは 音声認識、か ← あ は 合格しない
  {
    const j = new HybridVoiceJudge('hira') as any
    let passed: string | null = null
    j.onPass = (_s: string, k: string) => (passed = k)
    j.setVoiceprint(vp)
    void j.start()
    await runUntil(simT + 800)
    j.setTarget('か')
    await runUntil(simT + 1500)
    check(`しおん・とうろく あり：か は 音声認識（${mode(j)}）`, mode(j) === 'asr')
    ;[...MockRecog.all].reverse().find((r) => r.running)?.say('あ')
    await runUntil(simT + 2500)
    check(`しおん：か ← あ は 合格しない（${passed}）`, passed === null)
    j.stop()
    await runUntil(simT + 300)
  }
  console.log(fail ? `${fail}/${n} NG` : `ぜんぶ OK（${n}）`)
  process.exit(fail ? 1 : 0)
})()
