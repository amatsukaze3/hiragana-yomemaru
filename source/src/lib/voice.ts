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
import { VOWEL_ORDER, meanShape, modelProbs, personalProbs, vowelFeature } from './vowelClassifier'
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
const UTT_END_FRAMES = 7 // 約160ms 声が止まったら、ひとつの発声の終わり
const UTT_MIN_FRAMES = 5 // 約0.12秒より短い音は判定しない
const UTT_MAX_FRAMES = 50 // 約1.15秒より長い発声（おしゃべり・文）は不合格
const UTT_MIN_PROB = 0.5

/**
 * ひとつの発声が、目標の母音を読んだものかどうか。
 * 子音や出だしをのぞいた後ろの2/3（母音のところ）で、5つの母音の確率を平均し、
 * 目標の母音がいちばん高く、しかも一定以上（50%）のときだけ合格。
 */
export function utteranceMatches(target: Vowel, probs: number[][], minProb = UTT_MIN_PROB): boolean {
  const n = probs.length
  if (n < UTT_MIN_FRAMES || n > UTT_MAX_FRAMES) return false
  const tail = probs.slice(Math.floor(n * 0.34))
  const avg = [0, 0, 0, 0, 0]
  for (const p of tail) for (let i = 0; i < 5; i++) avg[i] += p[i] / tail.length
  const k = VOWEL_ORDER.indexOf(target)
  const thr = (globalThis as unknown as { __vthr?: number }).__vthr ?? minProb
  return avg.every((v, i) => i === k || v < avg[k]) && avg[k] >= thr
}

/** 母音ごとの物理特徴（帯域の平均レベル 0〜255 の比で判定） */
export function vowelMatches(kana: Kana, b: Bands): boolean {
  return vowelIs(KANA_INFO[kana]?.vowel ?? 'あ', b)
}


export function vowelIs(target: Vowel, b: Bands): boolean {
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
      // （子どもの高い声は Low に声の高さの成分が入るので、Low との比はゆるめにする）
      return MH >= ML * 0.9 && MH >= H2 && MH >= VH && MH >= L * 0.6
    case 'う':
      // Low に集中し、高い帯域が弱い
      return L >= ML && L >= MH * 1.15 && hiAvg <= L * 0.6
  }
}

/* ---------- 音声認識の文字合わせ ---------- */

/**
 * 音声認識は1文字だけを読むと、同じ読みの漢字や英字・数字で返すことがある。
 * その文字の読みになる、よく出る形をここに集める（同じ漢字が2つの文字に入っていてもよい）
 */
const HOMOPHONES: Record<Kana, string[]> = {
  あ: ['亜', '阿', '吾', 'ah'],
  い: ['胃', '井', '意', '位', '衣', '医', '異', '亥', '易', '以', '良い', 'e', 'ee'],
  う: ['鵜', '宇', '卯', '有', '雨', '羽', '右', 'oo'],
  え: ['絵', '柄', '江', '餌', '重', '会', '恵', 'a', 'eh'],
  お: ['尾', '緒', '御', '於', '小', '雄', '男', 'を', 'o', 'oh'],
  か: ['蚊', '可', '課', '科', '化', '火', '下', '加', '価', '家', '歌', '日', 'ka'],
  き: ['木', '気', '黄', '期', '機', '器', '危', '記', '起', '生', '樹', 'ki', 'key'],
  く: ['九', '区', '句', '苦', '来', '具', '9', 'ku'],
  け: ['毛', '家', '気', '化', 'k', 'ke'],
  こ: ['子', '粉', '個', '小', '故', '戸', '湖', '古', 'ko'],
  さ: ['差', '左', '佐', '砂', 'sa'],
  し: ['四', '死', '詩', '市', '氏', '師', '士', '詞', '4', 'c', 'she', 'see', 'shi'],
  す: ['酢', '巣', '素', '須', '州', 'su'],
  せ: ['背', '瀬', '世', '是', 'se'],
  そ: ['祖', '素', '其', 'so'],
  た: ['田', '他', '多', '太', 'ta'],
  ち: ['血', '地', '知', '千', '智', '池', '値', 'chi'],
  つ: ['津', '都', 'tsu'],
  て: ['手', 'te'],
  と: ['戸', '都', '十', '斗', '図', '徒', '10', 'to'],
  な: ['菜', '名', '那', 'na'],
  に: ['二', '荷', '似', '尼', '煮', '2', 'ni'],
  ぬ: ['奴', 'nu'],
  ね: ['根', '寝', '値', '音', '子', 'ne'],
  の: ['野', '乃', '之', 'no'],
  は: ['葉', '歯', '刃', '派', '羽', '波', 'わ', 'ha'],
  ひ: ['日', '火', '非', '比', '陽', '灯', '碑', 'hi'],
  ふ: ['府', '布', '負', '風', '符', '婦', '譜', 'fu'],
  へ: ['屁', '辺', '経', 'え', 'he'],
  ほ: ['帆', '歩', '穂', '保', '補', 'ho'],
  ま: ['間', '真', '魔', '馬', '麻', 'ma'],
  み: ['実', '身', '三', '見', '美', '未', '味', '巳', '3', 'me', 'mi'],
  む: ['無', '六', '夢', '6', 'mu'],
  め: ['目', '芽', '女', '雌', 'me'],
  も: ['藻', '喪', '茂', 'mo'],
  や: ['矢', '屋', '夜', '八', '野', '哉', '8', 'ya'],
  ゆ: ['湯', '油', '由', 'u', 'you', 'yu'],
  よ: ['世', '夜', '四', '代', '余', '予', '与', 'yo'],
  ら: ['等', '羅', '良', 'ra'],
  り: ['利', '理', '里', '李', '梨', '吏', 'ri'],
  る: ['留', '流', '瑠', 'ru'],
  れ: ['礼', '例', '零', 're'],
  ろ: ['炉', '路', '六', '呂', 'ro'],
  わ: ['輪', '和', '話', '環', 'は', 'wa'],
  を: ['お', '尾', '緒', '御', 'o', 'oh', 'wo'],
  ん: ['うん', 'ん', 'n', 'm'],
}

function toHiragana(s: string) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

function oneMatches(target: Kana, t: string): boolean {
  if (!t) return false
  if (t === target) return true
  if ([...t].every((c) => c === target)) return true // 「ああ」「あーあ」
  if (t.length <= 3 && t.startsWith(target) && /^[ぁ-ゖ]+$/.test(t) && /^[あいうえおんー]*$/.test(t.slice(1))) return true // 「かあ」「かん」
  const r = KANA_INFO[target]?.romaji
  if (r && t === r) return true
  return (HOMOPHONES[target] ?? []).includes(t)
}

export function transcriptMatches(target: Kana, raw: string): boolean {
  const base = toHiragana(raw.normalize('NFKC').toLowerCase())
  const whole = base.replace(/[\s、。．.,!！?？〜~ーっ「」]/g, '')
  if (oneMatches(target, whole)) return true
  // 前の声とつながって返ってきたとき（「さ か」など）は、最後のことばで くらべる
  const words = base.split(/[\s、。．.,!！?？]+/).map((w) => w.replace(/[〜~ーっ「」]/g, '')).filter(Boolean)
  if (words.length > 1 && oneMatches(target, words[words.length - 1])) return true
  // 区切りなしで つながったとき（「かきく」）は、最後の1文字
  return /^[ぁ-ゖ]{2,6}$/.test(whole) && whole.endsWith(target)
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

function isIOS() {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
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
  private uttCount = 0
  private asrLen = 0
  private asrSkip = 0
  private asrOnly = false
  private iosAsrFailed = false
  /** 音声認識が聞きとったことば（画面に出して、通らないときの手がかりにする） */
  onHeard: ((text: string) => void) | null = null
  private freq = new Uint8Array(0)
  private time = new Float32Array(0)
  private noiseFloor = 0.006
  private streak = 0
  private armed = true
  private quietFrames = 0
  private lockUntil = 0
  private targetSetAt = 0
  // ひとつの発声（声が出はじめてから止まるまで）のまとめ
  private utt: { feats: number[][]; silent: number; run: number } | null = null
  /** 登録した その子の「あいうえお」の形（なければ学習モデルで判定） */
  private voiceprint: number[][] | null = null
  private captureCb: ((shape: number[] | null) => void) | null = null

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
    // iPhone/iPad：音声認識（Apple）と周波数解析が同じマイクを取りあうので、音声認識だけで判定する
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
    if (isIOS() && !this.forceAnalyser && !this.iosAsrFailed && (w.SpeechRecognition || w.webkitSpeechRecognition)) {
      this.asrOnly = true
      this.lastError = ''
      this.running = true
      this.startAsr()
      if (this.asrAlive) {
        this.onStatus?.('listening', true)
        return 'listening'
      }
      this.running = false
      this.asrOnly = false
    }
    if (!HybridVoiceJudge.supported()) {
      this.onStatus?.('unsupported', false)
      return 'unsupported'
    }
    this.onStatus?.('starting', false)
    this.lastError = ''
    this.uttCount = 0
    setMicActive(true)
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
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
    this.analyser.minDecibels = -100
    this.analyser.maxDecibels = 0
    this.source.connect(this.analyser)
    this.freq = new Uint8Array(this.analyser.frequencyBinCount)
    this.time = new Float32Array(this.analyser.fftSize)
    this.running = true
    this.timer = window.setInterval(() => this.tick(), FRAME_MS)
    // iPhone/iPad で周波数解析を使うときと、声の登録中は、音声認識を使わない
    if (!isIOS() && !this.forceAnalyser) this.startAsr()
    this.onStatus?.('listening', this.asrAlive)
    return 'listening'
  }

  stop() {
    this.running = false
    this.asrOnly = false
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
    this.utt = null
    this.target = k
    this.streak = 0
    this.armed = false
    this.quietFrames = 0
    this.targetSetAt = performance.now()
    this.lockUntil = performance.now() + lockMs
    // 音声認識は止めない（止めると再開に時間がかかり、すぐ読んだ声を聞きのがす）。
    // かわりに、いまある結果より前のものは この問題では使わない
    this.asrSkip = this.asrLen
  }

  private probsOf(f: number[]) {
    return this.voiceprint ? personalProbs(f, this.voiceprint) : modelProbs(f)
  }

  /** その子の「あいうえお」を使う（null で学習モデルにもどす） */
  setVoiceprint(C: number[][] | null) {
    this.voiceprint = C
  }

  /** 声の登録：次の1回の発声の形を受けとる（問題は出さない） */
  capture(cb: (shape: number[] | null) => void, lockMs = 400) {
    this.target = null
    this.utt = null
    this.captureCb = cb
    this.armed = false
    this.quietFrames = 0
    this.targetSetAt = performance.now()
    this.lockUntil = performance.now() + lockMs
  }

  cancelCapture() {
    this.captureCb = null
  }

  /** 声の登録には周波数解析が要るので、そのあいだは音声認識だけのモードにしない */
  forceAnalyser = false

  /** チャイムなどを鳴らしている間は判定しない */
  hold(ms: number) {
    this.utt = null
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

    const feat = voiced ? vowelFeature(this.freq, this.analyser!.context.sampleRate / this.analyser!.fftSize) : null
    const probs = feat ? this.probsOf(feat) : null
    const tv = this.target ? VOWEL_ORDER.indexOf(KANA_INFO[this.target]?.vowel ?? 'あ') : -1
    const match = !!probs && tv >= 0 && probs.indexOf(Math.max(...probs)) === tv
    const listening = this.armed && now >= this.lockUntil && (!!this.target || !!this.captureCb)

    // 発声ごとに判定する（声が止まったところで、その発声全体を見て決める）
    if (listening && voiced) {
      if (!this.utt) this.utt = { feats: [], silent: 0, run: 0 }
      const u = this.utt
      u.silent = 0
      if (feat) u.feats.push(feat)
      u.run = match ? u.run + 1 : 0
    } else if (this.utt) {
      this.utt.silent++
      if (!listening) this.utt = null
      else if (this.utt.silent >= UTT_END_FRAMES) {
        const u = this.utt
        this.utt = null
        this.uttCount++
        // 声の登録中：この発声の形を返す
        if (this.captureCb) {
          if (u.feats.length >= UTT_MIN_FRAMES && u.feats.length <= UTT_MAX_FRAMES * 2) {
            const cb = this.captureCb
            this.captureCb = null
            cb(meanShape(u.feats))
          }
          return
        }
        // 登録があれば その子の声とくらべて 45%以上、なければ学習モデルで 50%以上
        // （音声認識が動いているときの学習モデルは、より はっきりした 60%以上）
        const thr = this.voiceprint ? 0.45 : this.asrAlive ? 0.6 : UTT_MIN_PROB
        if (this.target && utteranceMatches(KANA_INFO[this.target]?.vowel ?? 'あ', u.feats.map((f) => this.probsOf(f)), thr)) {
          this.onFrame?.({ bands, voiced, match: true, streak: STREAK_TO_PASS })
          this.pass('formant')
          return
        }
      }
    }
    this.streak = this.utt?.run ?? 0
    this.onFrame?.({ bands, voiced, match, streak: Math.min(this.streak, STREAK_TO_PASS) })
  }


  private startAsr() {
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
      this.asrLen = e.results.length
      const latest = e.results[e.results.length - 1]
      if (latest && latest[0]) this.onHeard?.(latest[0].transcript)
      if (!this.target || performance.now() < this.lockUntil) return
      for (let i = Math.max(e.resultIndex, this.asrSkip); i < e.results.length; i++) {
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
            if (this.asrOnly) {
          // 音声認識が使えない → 周波数解析で判定する
          this.iosAsrFailed = true
          this.running = false
          this.asrOnly = false
          void this.start()
          return
        }
        this.onStatus?.('listening', false)
      }
    }
    r.onend = () => {
      this.asrLen = 0
      this.asrSkip = 0
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
