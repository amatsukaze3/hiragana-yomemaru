// 判定エンジンの みちの テスト（iPad の まね：音声認識だけ）。node build.mjs engine_routes && node /tmp/judge_engine_routes.mjs
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
/** Apple の 音声認識の まね：say(こうほ) で つぎに とめた とき その こうほを かえす */
class MockRecog {
  lang = ''; continuous = true; interimResults = true; maxAlternatives = 1
  onresult: any = null; onend: any = null; onerror: any = null; onstart: any = null; onaudiostart: any = null
  onsoundstart: any = null; onspeechstart: any = null; onspeechend: any = null; onsoundend: any = null
  running = false; stopping = false; pending: string[] | null = null
  static cur: MockRecog | null = null
  constructor() { MockRecog.cur = this }
  start() { if (this.running) throw new Error('already'); this.running = true; this.stopping = false; this.pending = null; setTimeout(() => this.onstart?.(), 50); setTimeout(() => this.running && this.onaudiostart?.(), 300) }
  stop() { if (!this.running || this.stopping) return; this.stopping = true; const alts = this.pending; setTimeout(() => { if (alts) { const r: any = alts.map((t) => ({ transcript: t })); r.isFinal = true; this.onresult?.({ resultIndex: 0, results: [r] }) } this.running = false; this.stopping = false; this.onend?.() }, 120) }
  abort() { if (!this.running) return; this.stopping = true; setTimeout(() => { this.running = false; this.stopping = false; this.onend?.() }, 30) }
  say(alts: string[]) { this.pending = alts; this.onspeechstart?.() }
}
g.webkitSpeechRecognition = MockRecog

import { HybridVoiceJudge } from './engine_stub'
let fail = 0, n = 0
function check(name: string, ok: boolean) { n++; if (!ok) { fail++; console.log('NG', name) } }

function scenario(script: any, target: string, alts: string[], extras: string[] = [], vowel = false) {
  simT += 10000; evs = []
  const j = new HybridVoiceJudge(script) as any
  if (vowel) j.setVowelMode(true)
  const passes: string[] = []
  const misses: any[] = []
  j.onPass = (_s: string, k: string) => passes.push(k)
  j.onMiss = (info: any) => misses.push(info)
  void j.start()
  runUntil(simT + 800)
  j.setTarget(target)
  if (extras.length) j.setExtras(extras)
  runUntil(simT + 900)
  MockRecog.cur!.say(alts)
  runUntil(simT + 2500)
  j.stop()
  return { passes, misses, j }
}
const pass = (script: any, t: string, alts: string[], want: string | null, extras: string[] = [], vowel = false) => {
  const r = scenario(script, t, alts, extras, vowel)
  check(`[${script}]${vowel ? '（ぼおん）' : ''} ${t} ← ${JSON.stringify(alts)} → ${r.passes[0] ?? '×'}（のぞみ ${want ?? '×'}）`, (r.passes[0] ?? null) === want)
  return r
}
for (const s of ['hira', 'kata', 'roma', 'ROMA']) {
  const K = (h: string) => (s === 'hira' ? h : String.fromCharCode(h.charCodeAt(0) + 0x60))
  pass(s, K('ら'), ['ら'], K('ら'))
  pass(s, K('ら'), ['だ'], K('ら'))
  pass(s, K('ら'), ['Ra'], K('ら'))
  pass(s, K('ら'), ['等'], K('ら'))
  pass(s, K('ら'), ['あ'], null)
  pass(s, K('ら'), ['あ', 'ら'], K('ら'))
  pass(s, K('り'), ['じ'], K('り'))
  pass(s, K('り'), ['い'], null)
  pass(s, K('る'), ['ず'], K('る'))
  pass(s, K('る'), ['ど'], null)
  pass(s, K('れ'), ['で'], K('れ'))
  pass(s, K('れ'), ['0'], K('れ'))
  pass(s, K('ろ'), ['ど'], K('ろ'))
  pass(s, K('ろ'), ['Low'], K('ろ'))
  pass(s, K('か'), ['あ'], null)
  // ほかの カード
  const r = pass(s, K('か'), ['ら'], K('ら'), [K('ら'), K('さ')])
  check(`[${s}] ほかの カードで 合格 → ねらいは そのまま`, r.j.target === K('か'))
}
pass('hira', 'ら', ['う', 'ら'], null) // 形の にた う が いちばん
pass('kata', 'ラ', ['フ', 'ラ'], null)
pass('roma', 'ラ', ['な', 'ら'], null)
pass('kata', 'ラ', ['な', 'ら'], null)
// iPad：ちがう 文字の とき 合格しなかった しらせ（子音の カードは とうろく で よく ならない：vpHelps false）
const m = scenario('hira', 'ら', ['あ'])
check('iPad ら ← あ：しらせ 1かい', m.misses.length === 1 && m.misses[0].vpHelps === false && m.misses[0].kind === 'vowel')
const m2 = scenario('hira', 'ら', ['ら'])
check('iPad ら ← ら：しらせ なし', m2.misses.length === 0)
// ぼおん ごうかく（先生が きりかえる）：子音の ある 文字は 母音が あえば 合格。あ行・を・ん は かわらない
for (const s of ['hira', 'kata', 'roma', 'ROMA']) {
  const K = (h: string) => (s === 'hira' ? h : String.fromCharCode(h.charCodeAt(0) + 0x60))
  pass(s, K('か'), ['あ'], K('か'), [], true)
  pass(s, K('か'), ['た'], K('か'), [], true)
  pass(s, K('か'), ['か'], K('か'), [], true)
  pass(s, K('か'), ['き'], null, [], true)
  pass(s, K('か'), ['き', 'た'], null, [], true) // いちばんが ちがう 母音
  pass(s, K('ら'), ['あ'], K('ら'), [], true)
  pass(s, K('ら'), ['や'], K('ら'), [], true)
  pass(s, K('り'), ['い'], K('り'), [], true)
  pass(s, K('し'), ['ち'], K('し'), [], true)
  pass(s, K('す'), ['う'], K('す'), [], true)
  pass(s, K('あ'), ['か'], null, [], true)
  pass(s, K('あ'), ['あ'], K('あ'), [], true)
  pass(s, K('ん'), ['う'], null, [], true)
  // シューティング：ぴったりの 文字が さき、つぎに いちばんめの 目標、ほかの カード の じゅん
  pass(s, K('か'), ['さ'], K('さ'), [K('さ'), K('き')], true)
  pass(s, K('か'), ['た'], K('か'), [K('さ'), K('き')], true)
  pass(s, K('か'), ['ち'], K('き'), [K('さ'), K('き')], true)
}
// ぼおん ごうかく の iPad：ちがう 母音の ときの しらせは とうろく が やくに たつ（とうろく すると どの カードも 周波数解析で きく）
const mv = scenario('hira', 'か', ['き'], [], true)
check('iPad（ぼおん）か ← き：しらせ 1かい vpHelps', mv.misses.length === 1 && mv.misses[0].vpHelps === true)
// もどすと（しおん ごうかく）これまでどおり
{
  simT += 10000; evs = []
  const j = new HybridVoiceJudge('hira') as any
  const passes: string[] = []
  j.onPass = (_s: string, k: string) => passes.push(k)
  j.setVowelMode(true)
  j.setVowelMode(false)
  void j.start()
  runUntil(simT + 800)
  j.setTarget('か')
  runUntil(simT + 900)
  MockRecog.cur!.say(['あ'])
  runUntil(simT + 2500)
  j.stop()
  check('しおん に もどすと か ← あ は 合格しない', passes.length === 0)
}
console.log(fail ? `${fail}/${n} NG` : `ぜんぶ OK（${n}）`)
process.exit(fail ? 1 : 0)
