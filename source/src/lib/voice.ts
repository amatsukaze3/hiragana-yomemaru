/**
 * ハイブリッド音声判定エンジン
 *
 *  ① Web Speech API（音声認識）… 認識結果が目標の文字と一致したら即合格
 *  ② Web Audio API（AnalyserNode）… 母音フォルマントの帯域エネルギー比で判定
 *     4 フレーム（約 92ms）続けて目標母音の特徴に合致したら合格
 *
 * 子どもの短い単母音は音声認識だけだと無視されやすいので、②を並行して動かします。
 */
import { KANA_INFO, type Kana, type Vowel } from '../data/kana'
import { getAudioContext, setMicActive } from './audio'

export type PassSource = 'asr' | 'formant'
export type MicStatus = 'idle' | 'starting' | 'listening' | 'denied' | 'unsupported' | 'error'

export interface Bands {
  low: number // 220-480Hz
  midLow: number // 480-800Hz  (F1)
  midHigh: number // 800-1400Hz (F2)
  highF2: number // 1700-2800Hz (/e/ の F2)
  vHigh: number // 2800-4500Hz (/i/ の F2)
}

export interface FrameInfo {
  bands: Bands
  voiced: boolean
  match: boolean
  streak: number
}

const BAND_RANGES: Record<keyof Bands, [number, number]> = {
  low: [220, 480],
  midLow: [480, 800],
  midHigh: [800, 1400],
  highF2: [1700, 2800],
  vHigh: [2800, 4500],
}

const FRAME_MS = 23 // 4 フレーム ≒ 92ms
const STREAK_TO_PASS = 4

/** 母音ごとの物理特徴（帯域の平均レベル 0〜255 の比で判定） */
export function vowelMatches(kana: Kana, b: Bands): boolean {
  const target: Vowel = KANA_INFO[kana]?.vowel ?? 'あ'
  const { low: L, midLow: ML, midHigh: MH, highF2: H2, vHigh: VH } = b
  const eRatio = H2 / Math.max(ML, 1)
  const hiAvg = (H2 + VH) / 2
  const peakLow = Math.max(L, ML, MH, 1)
  switch (target) {
    case 'い':
      // Low が高く、HighF2 + VHigh も高い。間の MidHigh が谷になる
      return L >= ML * 0.95 && hiAvg >= MH * 0.95 && MH <= L * 0.85
    case 'え':
      // HighF2 / MidLow（eRatio）が 0.58 以上
      return eRatio >= 0.58 && ML >= L * 0.6
    case 'お':
      // eRatio が 0.65 未満で、HighF2 がとても弱い（こもった音）
      return eRatio < 0.65 && H2 <= peakLow * 0.45 && Math.max(ML, MH) >= L * 0.7
    case 'あ':
      // MidHigh（800-1400Hz）が優勢
      return MH >= ML * 0.9 && MH >= H2 && MH >= VH && MH >= L * 0.8
    case 'う':
      // Low に集中し、高い帯域が弱い
      return L >= ML && L >= MH * 1.15 && hiAvg <= L * 0.6
  }
}

/* ---------- 音声認識の文字合わせ ---------- */

const HOMOPHONES: Record<Kana, string[]> = {
  か: ['蚊', '可', '課', '科'], き: ['木', '気', '黄', '期'], く: ['九', '区', '句', '苦'], け: ['毛', '家'], こ: ['子', '粉', '個', '小'],
  さ: ['差'], し: ['四', '死', '詩', '市', '氏', 'she'], す: ['酢', '巣'], せ: ['背', '瀬'], そ: ['祖', '素'],
  た: ['田', '他'], ち: ['血', '地', '知', '千'], つ: ['津'], て: ['手'], と: ['戸', '都', '十'],
  な: ['菜', '名'], に: ['二', '荷', '似'], ぬ: ['奴'], ね: ['根', '寝', '値'], の: ['野', '乃'],
  は: ['葉', '歯', '刃', 'わ', 'ha'], ひ: ['日', '火', '非', '比'], ふ: ['府', '布', '負', '風'], へ: ['屁', '辺', 'え'], ほ: ['帆', '歩', '穂'],
  ま: ['間', '真', '魔'], み: ['実', '身', '三', 'me'], む: ['無', '六'], め: ['目', '芽'], も: ['藻', '喪'],
  や: ['矢', '屋', '夜'], ゆ: ['湯', 'you'], よ: ['世', '夜', '四', 'yo'],
  ら: ['等'], り: ['利', '理', '里'], る: ['留'], れ: ['礼', '例', '零'], ろ: ['炉', '路', '六'],
  わ: ['輪', '和', '話', 'は'], を: ['お', '尾', '緒', '御', 'o', 'oh'], ん: ['うん', 'ん', 'n', 'm'],
  あ: ['a', 'ah', '阿', '亜', '吾'],
  い: ['i', 'ee', '胃', '井', '意', '亥', '位', '易', '良い'],
  う: ['u', 'oo', '鵜', '宇', '卯', '有'],
  え: ['e', 'eh', '絵', '柄', '江', '餌', '重'],
  お: ['o', 'oh', '尾', '緒', '御', '於', 'を'],
}

function toHiragana(s: string) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

export function transcriptMatches(target: Kana, raw: string): boolean {
  const t = toHiragana(raw.normalize('NFKC').toLowerCase())
    .replace(/[\s、。．.!！?？〜~ーっ]/g, '')
  if (!t) return false
  if (t === target) return true
  if ([...t].every((c) => c === target)) return true // 「ああ」「あーあ」
  const r = KANA_INFO[target]?.romaji
  if (r && t === r) return true
  return (HOMOPHONES[target] ?? []).includes(t)
}

/* ---------- エンジン本体 ---------- */

type RecognitionCtor = new () => SpeechRecognitionLike
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

export class HybridVoiceJudge {
  private target: Kana | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private timer: number | null = null
  private recog: SpeechRecognitionLike | null = null
  private running = false
  private asrAlive = false
  private freq = new Uint8Array(0)
  private time = new Float32Array(0)
  private noiseFloor = 0.006
  private streak = 0
  private armed = true
  private quietFrames = 0
  private lockUntil = 0
  private targetSetAt = 0

  onPass: ((source: PassSource) => void) | null = null
  onFrame: ((f: FrameInfo) => void) | null = null
  onStatus: ((s: MicStatus, asr: boolean) => void) | null = null
  /** うまくいかなかったときの理由（保護者向けの説明に使う） */
  lastError = ''

  static supported() {
    return !!navigator.mediaDevices?.getUserMedia
  }

  async start(): Promise<MicStatus> {
    if (this.running) return 'listening'
    if (!HybridVoiceJudge.supported()) {
      this.onStatus?.('unsupported', false)
      return 'unsupported'
    }
    this.onStatus?.('starting', false)
    this.lastError = ''
    setMicActive(true)
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true },
      })
    } catch (e) {
      setMicActive(false)
      const name = (e as { name?: string })?.name ?? 'Error'
      this.lastError = name
      const st: MicStatus = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'unsupported' : 'error'
      this.onStatus?.(st, false)
      return st
    }
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
    this.source = ctx.createMediaStreamSource(this.stream)
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.3
    this.analyser.minDecibels = -90
    this.analyser.maxDecibels = -20
    this.source.connect(this.analyser)
    this.freq = new Uint8Array(this.analyser.frequencyBinCount)
    this.time = new Float32Array(this.analyser.fftSize)
    this.running = true
    this.timer = window.setInterval(() => this.tick(), FRAME_MS)
    this.startAsr()
    this.onStatus?.('listening', this.asrAlive)
    return 'listening'
  }

  stop() {
    this.running = false
    if (this.timer) window.clearInterval(this.timer)
    this.timer = null
    try {
      this.recog?.abort()
    } catch {
      /* noop */
    }
    this.recog = null
    this.asrAlive = false
    this.source?.disconnect()
    const had = !!this.stream
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    if (had) setMicActive(false)
    this.onStatus?.('idle', false)
  }

  /** 出題する文字を変える。前の声の残りで誤合格しないよう、少しの間ロックする */
  setTarget(k: Kana | null, lockMs = 300) {
    this.target = k
    this.streak = 0
    this.armed = false
    this.quietFrames = 0
    this.targetSetAt = performance.now()
    this.lockUntil = performance.now() + lockMs
    // 音声認識に残っている途中結果を捨てる（onend で自動再開）
    try {
      this.recog?.abort()
    } catch {
      /* noop */
    }
  }

  /** チャイムなどを鳴らしている間は判定しない */
  hold(ms: number) {
    this.lockUntil = Math.max(this.lockUntil, performance.now() + ms)
    this.streak = 0
  }

  private pass(source: PassSource) {
    if (!this.target) return
    this.target = null
    this.streak = 0
    this.onPass?.(source)
  }

  private bandMean(lo: number, hi: number) {
    const binHz = (this.analyser!.context.sampleRate) / this.analyser!.fftSize
    const a = Math.max(0, Math.floor(lo / binHz))
    const b = Math.min(this.freq.length - 1, Math.ceil(hi / binHz))
    let sum = 0
    for (let i = a; i <= b; i++) sum += this.freq[i]
    return sum / Math.max(1, b - a + 1)
  }

  private tick() {
    const an = this.analyser
    if (!an) return
    an.getFloatTimeDomainData(this.time)
    an.getByteFrequencyData(this.freq)

    let sq = 0
    for (let i = 0; i < this.time.length; i++) sq += this.time[i] * this.time[i]
    const rms = Math.sqrt(sq / this.time.length)
    const voiced = rms > Math.max(this.noiseFloor * 2.8, 0.008)
    if (!voiced) {
      // 周りの雑音レベルをゆっくり追いかける
      this.noiseFloor = Math.min(0.05, Math.max(0.002, this.noiseFloor * 0.96 + rms * 0.04))
    }

    const bands: Bands = {
      low: this.bandMean(...BAND_RANGES.low),
      midLow: this.bandMean(...BAND_RANGES.midLow),
      midHigh: this.bandMean(...BAND_RANGES.midHigh),
      highF2: this.bandMean(...BAND_RANGES.highF2),
      vHigh: this.bandMean(...BAND_RANGES.vHigh),
    }

    const now = performance.now()
    if (!this.armed) {
      // 前の声が途切れる（または一定時間たつ）まで待ってから判定を始める
      this.quietFrames = voiced ? 0 : this.quietFrames + 1
      if (now >= this.lockUntil && (this.quietFrames >= 3 || now - this.targetSetAt > 900)) this.armed = true
    }

    const match = !!this.target && voiced && vowelMatches(this.target, bands)
    if (this.armed && now >= this.lockUntil && match) this.streak++
    else this.streak = 0

    this.onFrame?.({ bands, voiced, match, streak: this.streak })
    if (this.streak >= STREAK_TO_PASS) this.pass('formant')
  }

  private startAsr() {
    // iPhone/iPad では音声認識がマイクを取りあい、周波数解析の入力が止まることがあるので使わない
    const ua = navigator.userAgent
    const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
    if (ios) return
    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Ctor) return
    let fatal = false
    const r = new Ctor()
    r.lang = 'ja-JP'
    r.continuous = true
    r.interimResults = true
    r.maxAlternatives = 5
    r.onresult = (e) => {
      if (!this.target || performance.now() < this.lockUntil) return
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const alts = e.results[i]
        for (let j = 0; j < alts.length; j++) {
          if (this.target && transcriptMatches(this.target, alts[j].transcript)) {
            this.pass('asr')
            return
          }
        }
      }
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        fatal = true
        this.asrAlive = false
        this.onStatus?.('listening', false)
      }
    }
    r.onend = () => {
      if (this.running && !fatal) {
        window.setTimeout(() => {
          try {
            if (this.running) r.start()
          } catch {
            /* すでに動いている */
          }
        }, 120)
      }
    }
    try {
      r.start()
      this.recog = r
      this.asrAlive = true
    } catch {
      this.asrAlive = false
    }
  }
}
