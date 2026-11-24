// 判定エンジン（voice.ts）を node で うごかす テスト台。AnalyserNode を まねる
import { HybridVoiceJudge } from '../../source/src/lib/voice'
import { meanShape } from '../../source/src/lib/vowelClassifier'

const SR = Number(process.env.SR ?? 48000) // SR=44100 で 44.1kHz の パソコンを まねる（音も 44.1kHz に して AUD で わたす）
const N = 2048
let simT = 0
;(globalThis as any).performance = { now: () => simT }
const timers: { t: number; f: () => void }[] = []
;(globalThis as any).window = globalThis
;(globalThis as any).setTimeout = (f: () => void, ms: number) => (timers.push({ t: simT + ms, f }), 0)

// blackman
const win = new Float64Array(N)
for (let i = 0; i < N; i++) win[i] = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / N) + 0.08 * Math.cos((4 * Math.PI * i) / N)
const COS = new Float64Array(N / 2), SIN = new Float64Array(N / 2)
for (let k = 0; k < N / 2; k++) { COS[k] = Math.cos((-2 * Math.PI * k) / N); SIN[k] = Math.sin((-2 * Math.PI * k) / N) }
function fftMag(x: Float64Array): Float64Array {
  const re = Float64Array.from(x), im = new Float64Array(N)
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j], re[i]] }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const step = N / len
    for (let i = 0; i < N; i += len)
      for (let k = 0; k < len / 2; k++) {
        const wr = COS[k * step], wi = SIN[k * step]
        const ar = re[i + k + len / 2], ai = im[i + k + len / 2]
        const tr = ar * wr - ai * wi, ti = ar * wi + ai * wr
        re[i + k + len / 2] = re[i + k] - tr; im[i + k + len / 2] = im[i + k] - ti
        re[i + k] += tr; im[i + k] += ti
      }
  }
  const m = new Float64Array(N / 2)
  for (let k = 0; k < N / 2; k++) m[k] = Math.hypot(re[k], im[k]) / N
  return m
}

class FakeAnalyser {
  fftSize = N
  frequencyBinCount = N / 2
  context = { sampleRate: SR }
  smoothingTimeConstant = 0.3
  minDecibels = -130
  maxDecibels = 0
  buf = new Float32Array(N)
  prev = new Float64Array(N / 2)
  push(s: Float32Array) {
    const b = new Float32Array(N)
    const keep = Math.max(0, N - s.length)
    b.set(this.buf.subarray(N - keep), 0)
    b.set(s.subarray(Math.max(0, s.length - N)), keep)
    this.buf = b
  }
  getFloatTimeDomainData(a: Float32Array) { a.set(this.buf) }
  getByteFrequencyData(a: Uint8Array) {
    const x = new Float64Array(N)
    for (let i = 0; i < N; i++) x[i] = this.buf[i] * win[i]
    const m = fftMag(x)
    for (let k = 0; k < N / 2; k++) {
      this.prev[k] = this.smoothingTimeConstant * this.prev[k] + (1 - this.smoothingTimeConstant) * m[k]
      const db = 20 * Math.log10(this.prev[k] + 1e-30)
      a[k] = Math.max(0, Math.min(255, Math.floor((255 / (this.maxDecibels - this.minDecibels)) * (db - this.minDecibels))))
    }
  }
}

function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1 }

/** 音を AnalyserNode の フレーム（23ms ごと）に して おく（目標が かわっても おなじ なので つかいまわす） */
type Frame = { time: Float32Array; freq: Uint8Array }
const cache = new Map<string, Frame[]>()
function framesOf(key: string, sig: Float32Array, opts: RunOpts): Frame[] {
  const k = key + '|' + (opts.noiseDb ?? -62) + '|' + (opts.gain ?? 1) + '|' + (opts.seed ?? 1)
  const c = cache.get(k)
  if (c) return c
  const an = new FakeAnalyser()
  const r = rng(opts.seed ?? 1)
  const nAmp = Math.pow(10, (opts.noiseDb ?? -62) / 20)
  const HOP = Math.round((SR * 23) / 1000)
  const pre = Math.round(1.6 * SR), post = Math.round(1.2 * SR)
  const total = pre + sig.length + post
  const out: Frame[] = []
  for (let p = 0; p < total; p += HOP) {
    const s = new Float32Array(Math.min(HOP, total - p))
    for (let i = 0; i < s.length; i++) { const q = p + i - pre; s[i] = (q >= 0 && q < sig.length ? sig[q] * (opts.gain ?? 1) : 0) + nAmp * r() }
    an.push(s)
    const f = { time: new Float32Array(N), freq: new Uint8Array(N / 2) }
    an.getFloatTimeDomainData(f.time); an.getByteFrequencyData(f.freq)
    out.push(f)
  }
  if (cache.size > 400) cache.delete(cache.keys().next().value!)
  cache.set(k, out)
  return out
}
class ReplayAnalyser {
  fftSize = N; frequencyBinCount = N / 2; context = { sampleRate: SR }; cur: Frame | null = null
  getFloatTimeDomainData(a: Float32Array) { a.set(this.cur!.time) }
  getByteFrequencyData(a: Uint8Array) { a.set(this.cur!.freq) }
}

export interface RunOpts { voiceprint?: number[][] | null; noiseDb?: number; asr?: boolean; gain?: number; seed?: number; acoustic?: boolean }

function run(key: string, sig: Float32Array, opts: RunOpts, begin: (j: any) => void) {
  simT = 0; timers.length = 0
  const j = new HybridVoiceJudge() as any
  const an = new ReplayAnalyser()
  j.analyser = an
  j.freq = new Uint8Array(N / 2)
  j.time = new Float32Array(N)
  j.running = true
  j.asrAlive = !!opts.asr
  j.setVoiceprint(opts.voiceprint ?? null)
  j.onsetCheck = !(globalThis as any).__noOnset
  // iPhone・iPad で 母音・ん を こえの とうろく で きく とき（音声認識なし・出だしの しらべは きびしい 線）
  j.acoustic = !!opts.acoustic
  j.micOpenAt = -1e9
  const frames = framesOf(key, sig, opts)
  const startAt = Math.floor(1600 / 23)
  frames.forEach((f, i) => {
    if (i === startAt) begin(j)
    an.cur = f
    simT += 23
    j.tick()
    for (let k = timers.length - 1; k >= 0; k--) if (timers[k].t <= simT) { const t = timers.splice(k, 1)[0]; t.f() }
  })
  return j
}

/** 1つの 音で 合格するか */
export function judgeOnce(sig: Float32Array, target: string, opts: RunOpts = {}, key = '') {
  let passed = false
  run(key || String(sig.length) + sig[1000], sig, opts, (j) => { j.onPass = () => (passed = true); j.setTarget(target) })
  return passed
}

/** こえの とうろく（あいうえお・ん の 音から 形を とる） */
export function capture(sig: Float32Array, opts: RunOpts = {}, key = ''): number[] | null {
  let shape: number[] | null = null
  run(key || String(sig.length) + sig[1000], sig, opts, (j) => j.capture((s: number[] | null) => (shape = s), 400, 5))
  return shape
}
export { meanShape }
