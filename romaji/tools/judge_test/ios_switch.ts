// iPad で こえの とうろく が ある とき：母音・ん は 周波数解析、子音は 音声認識 に きりかわるかの テスト（会話の 中の 調査用）
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
import { HybridVoiceJudge } from '../../source/src/lib/voice'
const HIRA: Record<string, string> = { ア: 'あ', イ: 'い', ウ: 'う', エ: 'え', オ: 'お', カ: 'か', キ: 'き', ク: 'く', ケ: 'け', コ: 'こ', サ: 'さ', ワ: 'わ', ヲ: 'を', ン: 'ん', タ: 'た', ナ: 'な' }
const VOW = new Set(['ア', 'イ', 'ウ', 'エ', 'オ', 'ヲ', 'ン'])
let rs = 7
const rnd = () => ((rs = (rs * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
const seqs = [['ワ', 'ヲ', 'ン', 'ワ', 'ン', 'ヲ'], ['ア', 'イ', 'ウ', 'エ', 'オ'], ['カ', 'ア', 'キ', 'イ', 'サ', 'ン', 'タ', 'オ', 'ナ', 'ウ', 'ケ', 'エ']]
const vp = [0, 1, 2, 3, 4, 5].map((i) => new Array(40).fill(0).map((_, k) => (k === i ? 1 : 0)))
const READ_AFTER = Number(process.env.READ_AFTER ?? 900)
let cOk = 0, cN = 0, vReady = 0, vN = 0, wrongMode = 0
const readyTimes: number[] = []
;(async () => {
  for (let round = 0; round < 10; round++)
    for (const seq of seqs) {
      const j = new HybridVoiceJudge() as any
      let passed = false
      j.onPass = () => (passed = true)
      j.setVoiceprint(vp)
      await j.start()
      await runUntil(simT + 600)
      for (const k of seq) {
        j.setTarget(k); passed = false
        const t0 = simT
        // 母音：周波数解析に なって きける ように なるまでの 時間
        if (VOW.has(k)) {
          vN++
          let ready = -1
          for (let dt = 0; dt <= 3000; dt += 20) { await runUntil(t0 + dt); if (j.acoustic && j.canHear()) { ready = dt; break } }
          if (ready >= 0) { vReady++; readyTimes.push(ready) } else if (!j.acoustic) wrongMode++
          // 周波数解析で 合格した ことに する（テストの 音は 無音なので）
          j.pass('formant')
        } else {
          cN++
          await runUntil(t0 + READ_AFTER * (0.6 + 0.8 * rnd()))
          if (j.acoustic) wrongMode++
          ;[...MockRecog.all].reverse().find((r) => r.running)?.say(HIRA[k])
          await runUntil(simT + 2000)
          if (passed) cOk++
        }
        // 合格：チャイム・0.7びょうで つぎ（フローラちゃんの 声は おぼえる では でない）
        j.hold(900)
        await runUntil(simT + 700)
      }
      j.stop()
      await runUntil(simT + 200)
    }
  readyTimes.sort((a, b) => a - b)
  console.log(`子音の カード（音声認識）：1かいめ 合格 ${cOk}/${cN}  母音・ん の カード：きける ように なった ${vReady}/${vN}（じかん 中央 ${readyTimes[readyTimes.length >> 1]}ms・さいだい ${readyTimes[readyTimes.length - 1]}ms）  きく しかたの まちがい ${wrongMode}  マイクを ひらいた かいすう ${gumCalls}・のこり ${openStreams}`)
})()
