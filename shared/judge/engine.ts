/**
 * マルチ合格エンジン（5つの アプリ：よめ丸・はなちゃん・デイジーちゃん・フローラちゃん 小文字／おおもじ で 共通）
 *
 * いくつかの「合格の みち」を もち、どれかで たしかに よめた ことが わかれば 合格に する。
 * ただし「母音だけの よみ」（か を あ と よむ）は、子音の 手がかりが ない かぎり 合格に しない。
 *
 *  みち① 音声認識（Web Speech API）… こうほ ぜんぶ（とちゅう・さいご）を match.ts で ひらがなの よみに なおし、
 *          目標の 文字（ら・ラ・等・Ra・らー・ららら…）なら 合格
 *  みち② こどもの はつおん … ら行の はじきが「だ・ぢ・づ・で・ど」に なった（ら→だ など）も 合格
 *  みち③ 周波数解析＋出だしの 学習モデル（パソコン・Android）… 母音が あい、子音が はっきり きこえたら 合格
 *  みち④ くみあわせ（パソコン・Android）… ら行・な行・ま行（よわい 子音）で、音声認識が 母音だけ（ら→あ）を きき、
 *          周波数解析の 出だしの モデルが その 子音を きいて いたら 合格（どちらが さきに きても よい）
 *  みち⑤ あ行・を・ん … これまでどおり（母音・ん の 形、iPad は こえの とうろく）
 *
 *  ねらう 文字は いくつでも よい（setTargets）。シューティングで、おちて くる どの カードを よんでも あたる。
 *  音声認識の みち（①②）は どの 目標でも、周波数解析の みち（③④⑤）は いちばんめの 目標だけ。
 *
 *  iPhone・iPad は 音声認識（Apple）と 周波数解析が おなじ マイクを とりあうので、音声認識だけで きく
 *  （こえの とうろく が あれば 母音・ん の カードだけ 周波数解析に きりかえる）。
 *
 *  ぼおん ごうかく（setVowelMode。先生が せんせいメニューで きりかえる。構音が 育ちとちゅうの 子むけ）：
 *  子音の ある 文字も 母音が あえば 合格（音声認識が「あ」「た」と きいた・周波数解析で 母音が あった）。
 *  あ行・を・ん は これまでどおり。iPhone・iPad は こえの とうろく が あれば どの カードも 周波数解析で きく。
 */
import { hasConsonant, specOf, type OnsetClass, type Vowel } from './kana46.ts'
import { VOWEL_ORDER, meanShape, modelProbs, personalProbs, updateNoise, vowelFeature } from './vowelClassifier.ts'
import { ONSET_CLASSES, onsetFeatures, onsetProbs, onsetScore } from './onset.ts'
import { classify, matchTargets, matchVowelTargets, normalize, readingVowel, type Heard, type HeardKind, type Script } from './match.ts'
import { JudgeLog } from './log.ts'

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

/** 読んだのに 合格しなかった とき の ようす */
export interface MissInfo {
  /** 音声認識が きいた もの（なければ ''） */
  heard: string
  kind: HeardKind | 'acoustic'
  /** こえの とうろく を すると よく なる 見こみが あるか（iPad の 子音の カードは とうろく を つかわない） */
  vpHelps: boolean
}

/** アプリが わたす 音まわりの 道具（audio.ts） */
export interface JudgePlatform {
  getAudioContext(): AudioContext
  /** マスコットが しゃべりはじめる・おわる 知らせ（しゃべる まえに まって ほしい ミリびょう を かえせる） */
  onMascotVoice(fn: (speaking: boolean) => number | void): () => void
  setMicActive(on: boolean): void
}

export interface JudgeConfig {
  /** 文字の しゅるい（形の にた 文字が ちがう） */
  script: Script
  /** 判定の きろくの 保存キー（null で のこさない） */
  logKey: string | null
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
/** 母音と 子音で 合格したとき、音声認識の けっかを まつ じかん（ms） */
const ASR_WAIT_MS = 500
/**
 * みち④：音声認識の「母音だけ」と 周波数解析の「子音が あった」を くみあわせる ときの 時間の はば。
 * 発声が おわって から この時間 いないに とどいた 音声認識の けっかと くみあわせる
 */
const FUSE_MS = 1600
/**
 * みち④ の ら行（ら・る・れ・ろ）の 出だしの モデルの 線（r の スコア）。
 * VOICEVOX 14声の 声ごとに はずした テストで、ら行の 43% が こえ、母音だけの よみは 7% だけ こえる。
 * （「すぐ 合格」の 線 thrFast は 24%／2%）。母音だけの よみは 音声認識が「あ」と きいて いる ことが 前提なので、
 * 2つ そろって はじめて 合格。り は い と 形が にて いて（よみまちがえ）、い と きいた ときは つかわない
 */
const R_FUSE_THR = 0.85
/**
 * 音声認識の けっかを はやく だす：声が おわったら（または 声が はじまって この 時間が たったら）音声認識を いったん とめる。
 * とめると、そこまでの 音の けっか（final）が すぐ かえってくる（とめないと 2〜3びょう かかる。iPad で 約3びょう）。とめたら すぐ また はじめる
 */
const ASR_FORCE_AFTER_SOUND_MS = 900
/**
 * ききとり窓：きこえる ように なって（目標が きまって）から この時間 けっかが こなければ とめる。
 * 声の 知らせが いちども こない ブラウザ では みじかく（_NO_EVENTS）、くる ブラウザ では 知らせが こなかった ときの ための あんぜん。
 * （窓を のばす・2かいめから のばす も ためしたが、iPad の まねでは すぐ よむ 子が おそく なる だけで よく ならなかった）
 */
const ASR_WINDOW_NO_EVENTS_MS = 1600
const ASR_WINDOW_MS = 5000
const ASR_DEBOUNCE_MS = 250
// パソコン：とちゅうの けっかが 来て この時間 あたらしい けっかが なければ とめる（声が つづいて いる あいだは まつ。さいだい ASR_DEBOUNCE_MAX_WAIT_MS）
const ASR_DEBOUNCE_PC_MS = 300
const ASR_DEBOUNCE_MAX_WAIT_MS = 1200
// 音声認識が とまった まま うごいて いなければ、この時間で もう いちど はじめる
const ASR_WATCHDOG_MS = 2500
// iPhone・iPad：マスコットが しゃべる まえに マイク（音声認識）を とめて まつ 時間
const VOICE_MUTE_WAIT_MS = 200
// iPhone・iPad で 母音・ん の カードを こえの とうろく で きく とき：マイクを ひらいて から きける ことに する までの 時間
// （出だしの しらべ（onset.ts）に 声の まえ 0.25びょうの 音が いるので）
const ACOUSTIC_READY_MS = 350
// iPhone・iPad：マイクの 音が とどきはじめた 知らせ（audiostart）から ほんとうに きこえる ように なるまでの よゆう
const ASR_READY_MARGIN_MS = 100
// audiostart が こない ときは、はじまった 知らせ（start）から この時間で きこえる ことに する
const ASR_READY_AFTER_START_MS = 400
// どちらの 知らせも こない ときは start() から この時間で きこえる ことに する
const ASR_READY_FALLBACK_MS = 1000
/** iPhone・iPad：音声認識の さいごの けっかが ちがう 文字だった とき、「合格しなかった」を しらせる までの まち（あとから 合格が くる ことが ある） */
const IOS_MISS_DELAY_MS = 350
/** 発声の なかで、いちばん大きい声より これだけ（-26dB）小さい音は「すきま」とみなす */
const UTT_GAP_RATIO = 0.05
/** 「いちばん大きい まとまり」に いれる 大きさ（-12dB）と、その そとに あっては いけない 大きさ（-10dB） */
const RUN_CORE_RATIO = 0.25
const RUN_OTHER_RATIO = 0.316
/** まとまりの なかで ゆるす すきま（UTT_END_FRAMES より みじかい すきまは ひとつづき） */
const RUN_MAX_GAP = 6

/**
 * 発声の なかの「いちばん大きい まとまり」（-12dB いないの フレームが 6フレームいかの すきまで つづく ところ）と、
 * その そとに ある「おなじくらい 大きい（-10dB いない）」フレームの かず。
 * まわりの 小さな音（おとなの こえ・いき・すすりなき）と つながった 発声でも、こどもが よんだ ところだけを とりだせる。
 * おしゃべり（大きさの にた 音が いくつも ある）は others が 0 に ならないので 判定しない。
 */
export function loudRun(levels: number[]) {
  const top = Math.max(0, ...levels)
  const p = levels.indexOf(top)
  const core = (i: number) => levels[i] >= top * RUN_CORE_RATIO
  let a = p
  let b = p
  for (let i = p - 1, gap = 0; i >= 0; i--) {
    if (core(i)) {
      a = i
      gap = 0
    } else if (++gap > RUN_MAX_GAP) break
  }
  for (let i = p + 1, gap = 0; i < levels.length; i++) {
    if (core(i)) {
      b = i
      gap = 0
    } else if (++gap > RUN_MAX_GAP) break
  }
  let others = 0
  for (let i = 0; i < levels.length; i++) if ((i < a || i > b) && levels[i] >= top * RUN_OTHER_RATIO) others++
  return { a, b, others }
}

/** 発声の 後ろ2/3 の 確率の平均（0〜4：あいうえお、5：ん） */
export function utteranceAvg(probs: number[][]) {
  const tail = probs.slice(Math.floor(probs.length * 0.34))
  const m = probs[0]?.length ?? 5
  const avg = new Array<number>(m).fill(0)
  for (const p of tail) for (let i = 0; i < m; i++) avg[i] += p[i] / tail.length
  return avg
}

/**
 * ひとつの発声が、目標の母音を読んだものかどうか。
 * 子音や出だしをのぞいた後ろの2/3（母音のところ）で、5つの母音の確率を平均し、
 * 目標の母音がいちばん高く、しかも一定以上（50%）のときだけ合格。
 */
export function utteranceMatches(target: Vowel, probs: number[][], minProb = UTT_MIN_PROB, minFrames = UTT_MIN_FRAMES): boolean {
  const n = probs.length
  if (n < minFrames || n > UTT_MAX_FRAMES) return false
  const avg = utteranceAvg(probs)
  const k = VOWEL_ORDER.indexOf(target)
  const thr = (globalThis as unknown as { __vthr?: number }).__vthr ?? minProb
  return avg.every((v, i) => i === k || v < avg[k]) && avg[k] >= thr
}

/**
 * 前の 波形 prev から いまの 波形 cur までに 何サンプル すすんだか（cur[i] = prev[i + d] と なる d）。
 * いくつも あう（無音など）ときは 時計から みた want に いちばん ちかい もの。みつからなければ -1
 */
export function audioAdvance(prev: Float32Array, cur: Float32Array, want: number) {
  const N = cur.length
  const K = Math.min(48, N)
  let best = -1
  for (let d = 0; d <= N - K; d++) {
    if (cur[0] !== prev[d]) continue
    let i = 1
    while (i < K && cur[i] === prev[d + i]) i++
    if (i === K && (best < 0 || Math.abs(d - want) < Math.abs(best - want))) best = d
  }
  return best
}

/**
 * よわい 子音（ま行・な行・ら行）を、音声認識が その母音だけ（「む」→「う」「ん」「うん」、「ら」→「あ」）に ききまちがえた
 */
function weakHeard(target: string, h: Heard) {
  const sp = specOf(target)
  if (!sp || (sp.cls !== 'N' && sp.cls !== 'R')) return false
  if (h.kind === 'vowel') return true
  if (sp.cls !== 'N' || !h.reading) return false
  return [...h.reading].every((c) => c === sp.vowel || c === 'ー' || c === 'ん')
}

/** みじかい かなの ことば（1もじを よんだ 音声認識の けっか：あ・ああ・か・かあ など） */
function isShortKana(t: string) {
  return /^[ぁ-ゖー]{1,3}$/.test(t)
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
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  // 声の はじまり・おわり（Safari・Chrome。来ない ブラウザも ある）
  onstart?: (() => void) | null
  onaudiostart?: (() => void) | null
  onsoundstart?: (() => void) | null
  onspeechstart?: (() => void) | null
  onspeechend?: (() => void) | null
  onsoundend?: (() => void) | null
}

function isAndroid() {
  return /Android/.test(navigator.userAgent)
}

export function isIOS() {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

/** t から、前の部分 prefix と同じところを のぞく（認識が言いなおしても、ちがいが出たところから後を返す） */
function stripPrefix(t: string, prefix: string) {
  const a = t.replace(/\s/g, '')
  const b = prefix.replace(/\s/g, '')
  let n = 0
  while (n < a.length && n < b.length && a[n] === b[n]) n++
  // 書きかえられて ほとんど一致しないときは、最後の数文字だけを見る
  if (n < b.length - 2) return a.slice(-3)
  return a.slice(n)
}

/** 周波数解析の 1つの 発声の まとめ（みち④ の くみあわせ用） */
interface UttEvidence {
  target: string
  endAt: number
  startAt: number
  /** 出だしの モデルが よわい 子音を きいた（みち④ の 線を こえた） */
  weakCons: boolean
}

export class JudgeEngine {
  /** いちばん ねらう 文字（周波数解析も これで しらべる） */
  private target: string | null = null
  /** ほかに よんでも よい 文字（シューティングの ほかの カード。音声認識の みち だけ） */
  private extras: string[] = []
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private timer: number | null = null
  private recog: SpeechRecognitionLike | null = null
  private running = false
  private asrAlive = false
  private uttCount = 0
  private asrSkip = 0
  // iPhone/iPad の音声認識は、ことばを1つの結果に つぎたしていく。問題がかわったときの「そこまでの文字」をおぼえておく
  private asrLastIdx = -1
  private asrLastText = ''
  private asrSkipText = ''
  private asrOnly = false
  private iosAsrFailed = false
  /** 音声認識が聞きとったことば（画面に出して、通らないときの手がかりにする） */
  onHeard: ((text: string) => void) | null = null
  private freq = new Uint8Array(0)
  private time = new Float32Array(0)
  private noiseFloor = 0.003
  // 直近 約2秒の音の大きさ（いちばん静かなところを「まわりの音」とみなす）
  private levelHist: number[] = []
  private noiseSpec: Float32Array | null = null
  private streak = 0
  private armed = true
  private quietFrames = 0
  private lockUntil = 0
  private targetSetAt = 0
  // ひとつの発声（声が出はじめてから止まるまで）のまとめ
  private utt: { feats: number[][]; levels: number[]; silent: number; run: number; top: number; startSample: number; startAt: number } | null = null
  // 子音を しらべるための、ちょくぜん 約3びょうの 音（AnalyserNode の 時間波形を つないだもの）
  private ring = new Float32Array(0)
  private prevTime = new Float32Array(0)
  private sampleCount = 0
  private lastTickAt = 0
  /** あ行（と ぼおん ごうかく）で 合格に する まえに、音声認識が ちがう 文字を きいて いないか まつ（時間切れで 合格） */
  private pending: { target: string; until: number; route: string } | null = null
  /** みち④：さいごの 発声で 周波数解析が よわい 子音を きいた */
  private fuseUtt: UttEvidence | null = null
  /** さいごの 発声の 子音の なかまの 確率（テスト・ログ用） */
  lastOnset: { probs: number[]; cls: string } | null = null
  /** 登録した その子の「あいうえお」の形（なければ学習モデルで判定） */
  private voiceprint: number[][] | null = null
  private captureCb: ((shape: number[] | null) => void) | null = null
  private captureRatio = 5
  /** 判定の きろく（せんせい用） */
  readonly log: JudgeLog

  onPass: ((source: PassSource, kana: string) => void) | null = null
  onFrame: ((f: FrameInfo) => void) | null = null
  onStatus: ((s: MicStatus, asr: boolean) => void) | null = null
  /** うまくいかなかったときの理由（保護者向けの説明に使う） */
  lastError = ''

  private platform: JudgePlatform
  private config: JudgeConfig

  constructor(platform: JudgePlatform, config: JudgeConfig) {
    this.platform = platform
    this.config = config
    this.log = new JudgeLog(config.logKey)
  }

  static supported() {
    return !!navigator.mediaDevices?.getUserMedia
  }

  /** いま ねらって いる 文字（いちばんめ）と、ほかに よんでも よい 文字 */
  private targetsAll(): string[] {
    if (!this.target) return []
    return [this.target, ...this.extras.filter((x) => x !== this.target)]
  }

  async start(): Promise<MicStatus> {
    // テスト用：状態を見られるようにする
    const dw = window as unknown as { __yomeDebug?: boolean; __judge?: unknown }
    if (dw.__yomeDebug) dw.__judge = this
    this.paused = false
    if (this.running) return 'listening'
    // iPhone/iPad：音声認識（Apple）と周波数解析が同じマイクを取りあうので、音声認識だけで判定する。
    // こえの とうろく が あっても 子音の ある 文字は 音声認識（周波数解析は 母音しか わからず「か」に「あ」で 合格して しまうため。2026-11-23）。
    // 母音・ん の カードは、とうろく が あれば 周波数解析で きく（iosAcoustic。Apple の 音声認識は「あ」「う」「ん」だけの 声を ききとりにくい：2026-11-24）
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
    if (isIOS() && !this.forceAnalyser && !this.iosAsrFailed && !this.iosAcoustic(this.target) && (w.SpeechRecognition || w.webkitSpeechRecognition)) {
      this.asrOnly = true
      this.lastError = ''
      this.running = true
      this.startAsr()
      if (this.asrAlive) {
        this.unsubVoice?.()
        this.unsubVoice = this.platform.onMascotVoice((s) => this.mascotVoice(s))
        this.log.add({ type: 'info', target: this.target, note: `start: iPad・iPhone 音声認識${this.vowelMode ? '・ぼおん ごうかく' : ''}` })
        this.onStatus?.('listening', true)
        return 'listening'
      }
      this.running = false
      this.asrOnly = false
    }
    if (!JudgeEngine.supported()) {
      this.onStatus?.('unsupported', false)
      return 'unsupported'
    }
    this.onStatus?.('starting', false)
    this.lastError = ''
    this.uttCount = 0
    const acoustic = !this.forceAnalyser && this.iosAcoustic(this.target)
    this.platform.setMicActive(true)
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
    } catch (e) {
      this.platform.setMicActive(false)
      // iPhone・iPad：母音の カードで マイクが ひらけなかったら、こえの とうろく は つかわず 音声認識に もどす
      if (acoustic) {
        this.iosAcousticFailed = true
        return this.start()
      }
      const name = (e as { name?: string })?.name ?? 'Error'
      this.lastError = name
      const st: MicStatus = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'unsupported' : 'error'
      this.onStatus?.(st, false)
      return st
    }
    const ctx = this.platform.getAudioContext()
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
    this.source = ctx.createMediaStreamSource(this.stream)
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.3
    this.analyser.minDecibels = -130
    this.analyser.maxDecibels = 0
    this.source.connect(this.analyser)
    this.freq = new Uint8Array(this.analyser.frequencyBinCount)
    this.time = new Float32Array(this.analyser.fftSize)
    this.running = true
    this.acoustic = acoustic
    this.micOpenAt = performance.now()
    this.lastTickAt = 0
    this.gapAt = this.sampleCount
    if (acoustic) {
      this.unsubVoice?.()
      this.unsubVoice = this.platform.onMascotVoice((s) => this.mascotVoice(s))
    }
    this.timer = window.setInterval(() => this.tick(), FRAME_MS)
    // iPhone/iPad で周波数解析を使うときと、声の登録中は、音声認識を使わない
    if (!isIOS() && !this.forceAnalyser) this.startAsr()
    if (!this.forceAnalyser)
      this.log.add({ type: 'info', target: this.target, note: `start: ${acoustic ? 'iPad・iPhone こえの とうろく（周波数解析）' : `周波数解析${this.asrAlive ? '＋音声認識' : 'だけ'}`}${this.voiceprint ? '・とうろく あり' : ''}${this.vowelMode ? '・ぼおん ごうかく' : ''} ${Math.round(ctx.sampleRate / 100) / 10}kHz` })
    this.onStatus?.('listening', this.asrAlive)
    return 'listening'
  }

  stop() {
    this.running = false
    this.asrOnly = false
    this.acoustic = false
    this.micMuted = false
    this.asrDeaf()
    window.clearTimeout(this.windowTimer)
    window.clearTimeout(this.missTimer)
    this.unsubVoice?.()
    this.unsubVoice = null
    this.mutedForVoice = false
    window.clearTimeout(this.unmuteTimer)
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
    if (had) this.platform.setMicActive(false)
    this.onStatus?.('idle', false)
  }

  /** 出題する文字を変える。前の声の残りで誤合格しないよう、少しの間ロックする */
  setTarget(k: string | null, lockMs = 300) {
    this.utt = null
    this.pending = null
    this.fuseUtt = null
    this.target = k
    this.extras = []
    this.streak = 0
    this.armed = false
    this.quietFrames = 0
    this.targetSetAt = performance.now()
    this.lockUntil = performance.now() + lockMs
    this.missAttempt = 0
    window.clearTimeout(this.missTimer)
    // 音声認識は止めない（止めると再開に時間がかかり、すぐ読んだ声を聞きのがす）。
    // かわりに、いまある結果より前のものは この問題では使わない
    this.asrSkip = Math.max(0, this.asrLastIdx)
    this.asrSkipText = this.asrLastText
    // iPhone・iPad：音声認識 と こえの とうろく（周波数解析）の どちらで きくかが かわる カードなら きりかえる
    if (this.needSwitch(k)) {
      void this.switchMode()
      return
    }
    // iPhone・iPad：まえの 問題で きいた ことばが のこって いたら（合格いがいで つぎへ すすんだ とき）、あたらしく する。
    // のこった ままだと、Apple の 音声認識が つぎの 文字と つなげて ことばに かきかえて しまう（pass の せつめい）。
    // 声の 知らせを もう つかって いた とき も（チャイムなどで。つぎに よむ 声で 知らせが こず、とめられなく なる）
    if (k && this.asrOnly && (this.asrLastText || this.sessionSound)) this.restartAsr()
    else this.armWindow()
  }

  /**
   * いくつかの 文字を ねらう（シューティング）。primary が かわらなければ ロックも 音声認識も そのまま
   * （カードが ふえる たびに ききなおさない）
   */
  setTargets(primary: string | null, others: string[] = []) {
    if (primary !== this.target) this.setTarget(primary)
    this.setExtras(others)
  }

  /** いちばんめの 目標は そのままで、ほかに よんでも よい 文字だけ かえる（シューティングの カードが ふえた・へった） */
  setExtras(others: string[]) {
    this.extras = this.target ? others.filter((x) => !!x && x !== this.target) : []
  }

  /** あ・い・う・え・お の確率（「ん」の登録は ここでは 使わない：ほかの文字の判定を じゃましないため） */
  private probsOf(f: number[]) {
    return this.voiceprint ? personalProbs(f, this.voiceprint.slice(0, 5)) : modelProbs(f)
  }

  /** 「ん」を 登録していれば、その子の「ん」と くらべて判定する（登録がなければ null） */
  private nMatches(feats: number[][]) {
    if (!this.voiceprint || this.voiceprint.length < 6) return null
    const avg = utteranceAvg(feats.map((f) => personalProbs(f, this.voiceprint!)))
    const top = avg.indexOf(Math.max(...avg))
    // 「ん」が いちばん近く 45%以上、または「ん」と「う」を あわせて 60%以上で どちらかが いちばん
    return (top === 5 && avg[5] >= 0.45) || ((top === 5 || top === 2) && avg[5] + avg[2] >= 0.6)
  }

  /**
   * ぼおん ごうかく（先生が せんせいメニューで きりかえる。構音が 育ちとちゅうの 子むけ）：
   * 子音の ある 文字も、母音が あえば 合格に する（子音は みない。「か」に「あ」「た」で 合格）。
   * あ行・を・ん は これまでどおり。先生が もどす（false）まで そのまま
   */
  private vowelMode = false
  setVowelMode(on: boolean) {
    if (this.vowelMode === on) return
    this.vowelMode = on
    this.pending = null
    this.fuseUtt = null
    this.log.add({ type: 'info', target: this.target, note: on ? 'ぼおん ごうかく に した' : 'しおん ごうかく に した' })
    // iPhone・iPad：こえの とうろく で きく カードが かわる
    if (this.needSwitch(this.target)) void this.switchMode()
  }
  get vowelModeOn() {
    return this.vowelMode
  }
  /** この 文字を ぼおん ごうかく で きくか（子音の ある 文字だけ） */
  private vowelRule(k: string | null) {
    return this.vowelMode && hasConsonant(k)
  }

  /** その子の「あいうえお」を使う（null で学習モデルにもどす） */
  setVoiceprint(C: number[][] | null) {
    this.voiceprint = C
    // とうろく しなおした あと：きく しかたが かわる なら きりかえる
    if (this.needSwitch(this.target)) void this.switchMode()
  }

  /**
   * iPhone・iPad で この カードを こえの とうろく（周波数解析）で きくか：とうろく が あって、母音（あいうえお・を）の カード。
   * ん は「ん」も とうろく して いる とき だけ（して いないと「う」と 見わけられない）。
   * Apple の 音声認識は「あ」「い」「う」「ん」だけの みじかい 声を ききとれない ことが おおい（2026-11-24。こどもが なんども いいなおして いた）。
   * 子音の ある 文字は これまでどおり 音声認識（「か」に「あ」で 合格させない）。
   * ぼおん ごうかく の ときは 子音の ある 文字も（母音で きめるので。Apple の 音声認識は 母音だけの 声を ききとりにくい）
   */
  private iosAcoustic(k: string | null) {
    if (!(isIOS() || this.acousticAnywhere) || this.forceAnalyser || this.iosAcousticFailed || !this.voiceprint || !k) return false
    const sp = specOf(k)
    if (!sp) return false
    if (sp.hira === 'ん') return this.voiceprint.length >= 6
    return sp.cls === 'V' || this.vowelMode
  }
  /** テスト用：iPhone・iPad で なくても iosAcoustic を つかう */
  acousticAnywhere = false
  /** マイクが ひらけなかった（もう こえの とうろく では きかない） */
  private iosAcousticFailed = false
  /** いま 母音・ん を こえの とうろく で きいて いる（iPhone・iPad） */
  private acoustic = false
  /** マイクを ひらいた 時刻 */
  private micOpenAt = 0
  /** マスコットが しゃべる あいだ マイクを とじて いる（こえの とうろく で きく とき） */
  private micMuted = false

  /** きく しかた（音声認識 ⇄ こえの とうろく）を かえる ひつようが あるか */
  private needSwitch(k: string | null) {
    return this.running && !this.switching && !!k && (this.asrOnly || this.acoustic) && this.iosAcoustic(k) !== this.acoustic
  }

  /** iPhone・iPad：カードの しゅるいが かわったら 音声認識 ⇄ 周波数解析 を きりかえる（スペシャルモーラと おなじ） */
  private switching = false
  private async switchMode() {
    if (this.switching) return
    this.switching = true
    const onStatus = this.onStatus
    const paused = this.paused
    this.onStatus = null // 画面の マイクの 表示は そのまま（いったん とめて すぐ つける）
    try {
      this.stop()
      await this.start()
    } finally {
      this.paused = paused
      this.onStatus = onStatus
      this.switching = false
      this.onStatus?.(this.running ? 'listening' : 'idle', this.asrAlive)
    }
    // きりかえて いる あいだに カードが かわった
    if (this.needSwitch(this.target)) void this.switchMode()
    else if (this.asrOnly) this.armWindow()
  }

  /** こえの とうろく で きいて いる とき、マスコットが しゃべる あいだ マイクを とじる（声が 電話の ような 音に ならない ように） */
  private closeMic() {
    this.utt = null
    this.source?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.source = null
    this.analyser = null
    this.platform.setMicActive(false)
  }
  private async reopenMic() {
    if (!this.running || !this.acoustic || this.stream) return
    this.platform.setMicActive(true)
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      if (!this.running || !this.acoustic || this.micMuted) {
        st.getTracks().forEach((t) => t.stop())
        return
      }
      const ctx = this.platform.getAudioContext()
      this.stream = st
      this.source = ctx.createMediaStreamSource(st)
      this.analyser = ctx.createAnalyser()
      this.analyser.fftSize = 2048
      this.analyser.smoothingTimeConstant = 0.3
      this.analyser.minDecibels = -130
      this.analyser.maxDecibels = 0
      this.source.connect(this.analyser)
      this.micOpenAt = performance.now()
      this.lastTickAt = 0
      this.gapAt = this.sampleCount
    } catch {
      // ひらけなかった：音声認識に もどす
      this.platform.setMicActive(false)
      this.iosAcousticFailed = true
      void this.switchMode()
    }
  }

  /** 声の登録：次の1回の発声の形を受けとる（問題は出さない） */
  capture(cb: (shape: number[] | null) => void, lockMs = 400, minRatio = 5) {
    this.captureRatio = minRatio
    this.target = null
    this.extras = []
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
    this.pending = null
    this.fuseUtt = null
    this.lockUntil = Math.max(this.lockUntil, performance.now() + ms)
    this.streak = 0
  }

  /** 先生の一時停止：判定を止める（resume で もどす） */
  paused = false
  pause() {
    this.paused = true
    this.utt = null
    this.pending = null
    this.fuseUtt = null
  }
  resume(lockMs = 400) {
    this.paused = false
    this.utt = null
    this.lockUntil = performance.now() + lockMs
  }

  private passCount = 0
  /** 読んだのに合格しなかった発声ごとに よばれる */
  onMiss?: (info?: MissInfo) => void
  private missTimer = 0
  /** iPhone・iPad：この 目標で「合格しなかった」を しらせた かず（おなじ けっかで 2かい しらせない） */
  private missAttempt = 0

  private pass(source: PassSource, kana: string | null, route: string) {
    if (!this.target || this.paused || !kana) return
    this.passCount++
    this.log.add({ type: 'pass', target: this.target, route, note: kana !== this.target ? `hit=${kana}` : undefined })
    if (kana !== this.target) {
      // ほかの カードを よんだ（シューティング）：ねらいの カードは そのまま きき つづける
      this.extras = this.extras.filter((x) => x !== kana)
      this.lockUntil = Math.max(this.lockUntil, performance.now() + 300)
    } else {
      this.target = null
      this.extras = []
    }
    this.pending = null
    this.fuseUtt = null
    window.clearTimeout(this.windowTimer)
    window.clearTimeout(this.missTimer)
    this.streak = 0
    // 合格したら 音声認識を あたらしく しなおす（つぎの 文字の けっかが まえの 文字に つながらない ように）
    //  - パソコン：つながると おそく なる
    //  - iPhone・iPad（2026-11-24）：おなじ 音声認識の まま つぎの 文字を よむと、Apple の 音声認識が まえの 文字と
    //    つなげて ことばに かきかえて しまう（か＋き →「柿」、す＋し →「寿司」）。すると 2もじめ いこうは 1かいめで とおらず、
    //    いいなおすと（音声認識が あたらしく なって）とおる。合格の チャイムと つぎの 文字が でるまでの あいだに あたらしく する
    this.restartAsr()
    this.onPass?.(source, kana)
  }

  private bandMean(lo: number, hi: number) {
    const binHz = this.analyser!.context.sampleRate / this.analyser!.fftSize
    const a = Math.max(0, Math.floor(lo / binHz))
    const b = Math.min(this.freq.length - 1, Math.ceil(hi / binHz))
    let sum = 0
    for (let i = a; i <= b; i++) sum += this.freq[i]
    return sum / Math.max(1, b - a + 1)
  }

  /** いま こどもが よんで いる（声が でて いる）か。シューティングで カードを とめる のに つかう */
  private speakingSince = 0

  private tick() {
    const an = this.analyser
    if (!an) return
    an.getFloatTimeDomainData(this.time)
    an.getByteFrequencyData(this.freq)
    this.appendSamples()
    // 音声認識が とまった ままなら もう いちど はじめる
    if (this.recog && this.asrAlive && this.asrDownAt && performance.now() - this.asrDownAt > ASR_WATCHDOG_MS) {
      this.asrDownAt = performance.now()
      try {
        this.recog.start()
      } catch {
        /* すでに うごいている */
      }
    }

    let sq = 0
    for (let i = 0; i < this.time.length; i++) sq += this.time[i] * this.time[i]
    const rms = Math.sqrt(sq / this.time.length)
    // 小さな声でも聞きとれるように、しきい値は まわりの雑音の 1.9倍（最低 約-54dB）。
    // 声が出ているあいだは、語尾が小さくなっても とぎれないよう 0.6倍まで下げる
    const startThr = Math.max(this.noiseFloor * 1.9, 0.002)
    const voiced = rms > (this.utt ? Math.max(startThr * 0.6, this.noiseFloor * 1.3) : startThr)
    // 声が出ていないときの音を「まわりの音」として おぼえる（声の形から差し引く）
    if (!this.noiseSpec || this.noiseSpec.length !== this.freq.length) this.noiseSpec = new Float32Array(this.freq.length)
    if (!voiced && !this.utt && rms <= this.noiseFloor * 1.5) updateNoise(this.noiseSpec, this.freq)
    // まわりの音（教室のざわざわ）の大きさ：直近 約2秒のうち 静かな方から1割のところ。
    // ずっと ざわざわしていても、それを「声」とまちがえ続けないようにする
    this.levelHist.push(rms)
    if (this.levelHist.length > 90) this.levelHist.shift()
    if (this.levelHist.length >= 20) {
      const sorted = [...this.levelHist].sort((a, b) => a - b)
      const bg = sorted[Math.floor(sorted.length * 0.1)]
      this.noiseFloor = Math.min(0.3, Math.max(0.001, bg))
    } else if (!voiced) {
      this.noiseFloor = Math.min(0.05, Math.max(0.001, this.noiseFloor * 0.96 + rms * 0.04))
    }

    const bands: Bands = {
      low: this.bandMean(...BAND_RANGES.low),
      midLow: this.bandMean(...BAND_RANGES.midLow),
      midHigh: this.bandMean(...BAND_RANGES.midHigh),
      highF2: this.bandMean(...BAND_RANGES.highF2),
      vHigh: this.bandMean(...BAND_RANGES.vHigh),
    }

    const now = performance.now()
    if (this.pending && (this.pending.target !== this.target || this.paused)) this.pending = null
    if (this.pending && now >= this.pending.until) {
      const { target: t, route } = this.pending
      this.pending = null
      this.pass('formant', t, route)
    }
    if (!this.armed) {
      // 前の声が途切れる（または一定時間たつ）まで待ってから判定を始める
      this.quietFrames = voiced ? 0 : this.quietFrames + 1
      if (now >= this.lockUntil && (this.quietFrames >= 3 || now - this.targetSetAt > 900)) this.armed = true
    }

    const tv = this.target ? VOWEL_ORDER.indexOf(specOf(this.target)?.vowel ?? 'あ') : -1
    const feat = voiced ? vowelFeature(this.freq, this.analyser!.context.sampleRate / this.analyser!.fftSize, this.noiseSpec) : null
    const probs = feat ? this.probsOf(feat) : null
    const match = !!probs && tv >= 0 && probs.indexOf(Math.max(...probs)) === tv
    const listening = !this.paused && this.armed && now >= this.lockUntil && (!!this.target || !!this.captureCb)

    // 発声の なかで いちばん大きい声より ずっと小さい音（-26dB）は、すきま として あつかう。
    // こどもの こえの まわりに 小さな音（おとなの こえ・いき・すすりなき）が つづいていても、1もじずつ くぎれる
    const inGap = !!this.utt && this.utt.top > 0 && rms < this.utt.top * UTT_GAP_RATIO

    // 発声ごとに判定する（声が止まったところで、その発声全体を見て決める）
    if (listening && voiced && !inGap) {
      if (!this.utt) this.utt = { feats: [], levels: [], silent: 0, run: 0, top: 0, startSample: this.sampleCount - this.time.length, startAt: now }
      const u = this.utt
      u.silent = 0
      if (feat) {
        u.feats.push(feat)
        u.levels.push(rms)
        u.top = Math.max(u.top, rms)
      }
      if (u.feats.length >= 3 && !this.speakingSince) this.speakingSince = u.startAt
      // 長すぎる「声」は 古いほうから すてる（すてきると、まわりの音の あとに よんだ 声まで きれてしまうため）
      if (u.feats.length > UTT_MAX_FRAMES * 2) {
        u.feats.shift()
        u.levels.shift()
        u.top = Math.max(0, ...u.levels)
      }
      u.run = match ? u.run + 1 : 0
    } else if (this.utt) {
      this.utt.silent++
      if (!listening) {
        this.utt = null
        this.speakingSince = 0
      } else if (this.utt.silent >= UTT_END_FRAMES) {
        const u = this.utt
        this.utt = null
        this.speakingSince = 0
        this.uttCount++
        // 合格（または あ行の まち）に した ときは、その 合図の 表示を うわがき しない
        if (this.endUtterance(u, bands, now)) return
      }
    }
    this.streak = this.utt?.run ?? 0
    this.onFrame?.({ bands, voiced, match, streak: Math.min(this.streak, STREAK_TO_PASS) })
  }

  /** 発声が おわった：その 発声 ぜんたいを みて きめる（みち③④⑤）。合格・まちに した ときは true */
  private endUtterance(u: NonNullable<JudgeEngine['utt']>, bands: Bands, now: number): boolean {
    // いちばん大きい まとまりだけを つかう（まわりの 小さな音は のぞく）
    const r = loudRun(u.levels)
    const runLen = r.b - r.a + 1
    const runFeats = u.feats.slice(r.a, r.b + 1)
    const runLevels = u.levels.slice(r.a, r.b + 1)
    // 声の大きさによらず同じに判定できるよう、その発声のいちばん大きいところから -12dB までの部分だけを使う
    const top = Math.max(0, ...u.levels)
    const core = runFeats.filter((_, i) => runLevels[i] >= top * RUN_CORE_RATIO)
    // 声の登録中：この発声の形を返す
    if (this.captureCb) {
      // まわりの子の声をひろわないよう、まわりの音より はっきり大きい声（約+14dB）だけを登録する
      if (runLen >= UTT_MIN_FRAMES && runLen <= UTT_MAX_FRAMES * 2 && r.others === 0 && top >= this.noiseFloor * this.captureRatio) {
        const cb = this.captureCb
        this.captureCb = null
        cb(meanShape(core))
      }
      return false
    }
    // 登録があれば その子の声とくらべて 45%以上、なければ学習モデルで 50%以上
    // （音声認識が動いているときの学習モデルは、より はっきりした 60%以上）
    const thr = this.voiceprint ? 0.45 : this.asrAlive ? 0.6 : UTT_MIN_PROB
    // ながさは「いちばん大きい まとまり」で みる。ほかに おなじくらい 大きい音が ある（おしゃべり）なら 判定しない
    const lenOk = runLen >= UTT_MIN_FRAMES && runLen <= UTT_MAX_FRAMES && r.others === 0
    // 1もじを よんだ ような 声の あと は、音声認識の けっかを まつ あいだ シューティングの カードを とめる（judging）
    if (lenOk) this.lastUttEndAt = now
    const t = this.target
    const sp = specOf(t)
    const nOk = sp?.hira === 'ん' && lenOk && core.length >= 3 ? this.nMatches(core) : null
    const dump = (globalThis as unknown as { __onsetDump?: number[][] }).__onsetDump
    if (dump && lenOk) {
      const sr = this.analyser!.context.sampleRate
      const o = onsetFeatures(this.samples(u.startSample - Math.round(sr * 0.25), this.sampleCount), sr)
      if (o) dump.push([u.top, ...o.feat])
    }
    const vowelOk = !!t && !!sp && lenOk && (nOk ?? utteranceMatches(sp.vowel, core.map((f) => this.probsOf(f)), thr, 3))
    // 子音と 母音の 両方が あって はじめて 合格（母音だけの よみは 合格に しない）
    //  - 音声認識が 目標の 文字を きいたら 合格（startAsr。子音も 母音も わかる）
    //  - 周波数解析（ここ）は 母音しか わからないので、つぎの ときだけ 合格に する：
    //    ・出だしの 学習モデル（onset.ts）で 目標の 子音が はっきり きこえた（母音だけの よみが こえるのは 2% いか）
    //    ・ら行・な行・ま行：音声認識が その 母音だけを きき、出だしの モデルが その 子音を きいた（みち④）
    //    ・あ行・を は、子音っぽく なく、音声認識が ちがう 文字を きいて いなければ 合格（0.5びょう まって たしかめる）
    //    ・ん は これまでどおり
    //  - この 発声で 音声認識が ちがう 文字（「あ」「さ」など）を きいていたら 不合格
    let onsetNote = ''
    // ぼおん ごうかく（子音の ある 文字）：母音が あえば 合格（子音は みない）
    const vr = this.vowelRule(t)
    // みち④（くみあわせ）は 母音を 音声認識が たしかめるので、周波数解析の 母音の しらべは いらない（ながさ だけ みる）
    const fuseable = !vr && !!t && !!sp && lenOk && this.asrAlive && (sp.cls === 'R' || sp.cls === 'N')
    if ((vowelOk || fuseable) && t && sp) {
      const heard = this.asrAlive ? this.heardDuring(t, u.startAt) : null
      const cls = sp.cls
      let ok: 'now' | 'wait' | 'fuse' | 'no'
      let route = 'onset'
      if (vr && cls) {
        // ぼおん ごうかく：音声認識が ちがう 母音（「か」に「き」）を きいて いたら 合格に しない。
        // 出だしの モデルが 子音を はっきり きいた・音声認識が ない ときは すぐ、それいがいは 音声認識の けっかを すこし まつ（あ行と おなじ）
        route = 'vowelmode'
        const o = this.onsetScoreOf(cls, u.startSample)
        if (o) onsetNote = `${cls}:${o.score.toFixed(2)}${this.lastOnset ? `(${this.lastOnset.cls})` : ''}`
        const otherVowel = !!heard && readingVowel(heard.reading ?? '') !== sp.vowel
        ok = otherVowel ? 'no' : (o && o.score >= o.fast) || !this.asrAlive ? 'now' : 'wait'
      } else if (!cls) ok = heard ? 'no' : 'now' // ん
      else {
        const o = this.onsetScoreOf(cls, u.startSample)
        if (o) onsetNote = `${cls}:${o.score.toFixed(2)}${this.lastOnset ? `(${this.lastOnset.cls})` : ''}`
        const fast = vowelOk && !!o && o.score >= o.fast
        const weak = fuseable && !!o && this.weakConsonant(t, cls, o.score, o.fast)
        if (heard) {
          // ま行・な行・ら行（m・n・r）は 音声認識が「う」「ん」「あ」と ききまちがえやすい。
          // 出だしの 学習モデルが 子音を きいて いれば 合格（みち④）
          ok = weak && weakHeard(t, heard) ? 'now' : 'no'
          route = 'fuse'
        } else if (fast) ok = 'now'
        else if (vowelOk && cls === 'V' && (o ? o.score >= (this.asrAlive ? o.loose : o.strict) : !this.acoustic)) {
          ok = this.asrAlive ? 'wait' : 'now'
          route = 'vowel'
        } else if (weak) ok = 'fuse' // 音声認識の けっかを まって くみあわせる
        else ok = 'no' // 子音の 文字は 音声認識が 合格に するのを まつ
      }
      this.log.add({ type: 'utt', target: t, vowelOk, onset: onsetNote, route: ok === 'no' ? undefined : route, kind: ok, ms: u.feats.length * FRAME_MS })
      if (ok === 'fuse') {
        this.fuseUtt = { target: t, startAt: u.startAt, endAt: now, weakCons: true }
      } else if (ok !== 'no') {
        this.onFrame?.({ bands, voiced: false, match: true, streak: STREAK_TO_PASS })
        if (ok === 'wait') {
          this.pending = { target: t, until: now + ASR_WAIT_MS, route }
          // 音声認識の さいごの けっかを はやく もらって たしかめる
          this.finalizeAsr()
        } else this.pass('formant', t, route)
        return true
      }
    } else if (t && lenOk) this.log.add({ type: 'utt', target: t, vowelOk: false, ms: u.feats.length * FRAME_MS })
    // 読んだのに 合格しなかった（音声認識が あとから 合格にすることもあるので 少し待ってから知らせる）
    // 音声認識の けっかを はやく もらうため、ここで いったん とめる（パソコン：声の おわりは 周波数解析で わかる）
    // ながすぎ・ほかの音が あった ときも とめる（とめないと 音声認識の おわりを 2〜4びょう まつ ことに なる）
    if (t && runLen >= UTT_MIN_FRAMES && !this.paused) this.finalizeAsr()
    if (t && lenOk && !this.paused) {
      const n = this.passCount
      window.setTimeout(() => {
        if (this.target === t && this.passCount === n && !this.paused) {
          const h = this.recentAsr && this.recentAsr.at >= u.startAt - 200 ? this.recentAsr : null
          this.log.add({ type: 'miss', target: t, alts: h ? [h.text] : undefined, kind: h?.heard.kind ?? 'acoustic' })
          this.onMiss?.({ heard: h?.text ?? '', kind: h?.heard.kind ?? 'acoustic', vpHelps: true })
        }
      }, 1500)
    }
    return false
  }

  /**
   * みち④ の 子音の 線：ら行（ら・る・れ・ろ）は R_FUSE_THR、な行・ま行は これまでどおり「すぐ 合格」の 線。
   * り は「い」と 形が にて いる ので つかわない
   */
  private weakConsonant(t: string, cls: OnsetClass, score: number, fast: number) {
    if (cls === 'R') {
      if (specOf(t)?.hira === 'り' || score < Math.min(R_FUSE_THR, fast)) return false
      // 出だしの モデルが r より n に ちかい ときは つかわない（「な」と よんだ 声を 音声認識が「あ」と きいた かも しれない。
      // ローマ字は r と n の 字が にて いて よみまちがえやすい）。ら行の 合格は 51% → 49% と ほとんど かわらず、
      // な行の 声で まちがって 合格する のは 40% → 19%（音声認識が な を あ と きいた とき）
      const p = this.lastOnset?.probs
      if (p && p[ONSET_CLASSES.indexOf('N')] > p[ONSET_CLASSES.indexOf('R')]) return false
      return true
    }
    if (cls === 'N') return score >= fast
    return false
  }

  /** AnalyserNode の 時間波形から、前の tick いこうの あたらしい 音だけを つなぐ */
  private appendSamples() {
    const sr = this.analyser!.context.sampleRate
    const N = this.time.length
    if (this.ring.length !== Math.round(sr * 3) || this.prevTime.length !== N) {
      this.ring = new Float32Array(Math.round(sr * 3))
      this.prevTime = new Float32Array(N)
      this.sampleCount = 0
      this.lastTickAt = 0
    }
    const now = performance.now()
    const want = this.lastTickAt ? Math.max(0, Math.round(((now - this.lastTickAt) * sr) / 1000)) : N
    // 前の 波形と かさなる ところを さがして、ほんとうに すすんだ ぶんだけ つなぐ。
    // （音は 10〜20ms ずつ まとめて とどくので、時計から きめると 音が だぶったり ぬけたりして、子音の 形が こわれる）
    let n = this.lastTickAt ? audioAdvance(this.prevTime, this.time, want) : N
    if (n < 0) {
      // かさなりが ない：tick が おくれて 音が ぬけた（その あたりの 出だしは しらべない）
      n = Math.min(N, want)
      this.gapAt = this.sampleCount
    }
    this.lastTickAt = now
    const L = this.ring.length
    for (let i = N - n; i < N; i++) this.ring[this.sampleCount++ % L] = this.time[i]
    this.prevTime.set(this.time)
  }

  /** ring から [a, b) の 音を とりだす */
  private samples(a: number, b: number) {
    const L = this.ring.length
    a = Math.max(a, this.sampleCount - L, 0)
    const out = new Float32Array(Math.max(0, b - a))
    for (let i = a; i < b; i++) out[i - a] = this.ring[i % L]
    return out
  }

  /** 音声認識が さいごに きいた ことば（いちばんの こうほ）と、いちばんめの 目標に たいする わけかた */
  private recentAsr: { text: string; heard: Heard; at: number; target: string } | null = null

  /** この 発声の あいだに、音声認識が 目標と ちがう みじかい かな を きいていたか（なければ null） */
  private heardDuring(target: string, uttStartAt: number): Heard | null {
    const r = this.recentAsr
    if (!r || r.target !== target || r.at < uttStartAt - 200) return null
    const k = r.heard.kind
    return (k === 'vowel' || k === 'other' || k === 'confusable') && !!r.heard.reading && isShortKana(r.heard.reading) ? r.heard : null
  }

  /** 出だしの 学習モデル（onset.ts）の スコア。音が ぬけた・出だしが とれない ときは null */
  private onsetScoreOf(want: OnsetClass, startSample: number) {
    this.lastOnset = null
    const sr = this.analyser!.context.sampleRate
    const from = startSample - Math.round(sr * 0.25)
    if (this.gapAt >= from) return null
    const o = onsetFeatures(this.samples(from, this.sampleCount), sr)
    if (!o) return null
    const p = onsetProbs(o.feat)
    this.lastOnset = { probs: p, cls: ONSET_CLASSES[p.indexOf(Math.max(...p))] }
    return onsetScore(p, want)
  }

  /** さいごに 音が ぬけた ところ（サンプル） */
  private gapAt = -1
  /** さいごの 発声が おわった 時刻 */
  private lastUttEndAt = 0

  /** 音声認識を いったん とめて、そこまでの けっかを すぐ もらう（とまったら onend で すぐ また はじめる） */
  private asrFinalizing = false
  /**
   * iPhone・iPad：マスコットが しゃべる あいだは 音声認識（マイク）を とめる。
   * マイクを つかって いる あいだの iPhone・iPad の 音は 電話のような 音質に なり、声が かすれて きこえるため。
   * しゃべりはじめ：とめて、VOICE_MUTE_WAIT_MS まって もらう。しゃべりおわり：すぐ また はじめる
   */
  private unsubVoice: (() => void) | null = null
  private mutedForVoice = false
  private unmuteTimer = 0
  private mascotVoice(speaking: boolean): number {
    if (this.acoustic && this.running) {
      window.clearTimeout(this.unmuteTimer)
      if (speaking) {
        if (this.micMuted) return 0
        this.micMuted = true
        this.closeMic()
        return VOICE_MUTE_WAIT_MS
      }
      this.unmuteTimer = window.setTimeout(() => {
        this.micMuted = false
        void this.reopenMic()
      }, 0)
      return 0
    }
    if (!this.asrOnly || !this.running || !this.recog) return 0
    window.clearTimeout(this.unmuteTimer)
    if (speaking) {
      if (this.mutedForVoice) return 0
      this.mutedForVoice = true
      window.clearTimeout(this.forceTimer)
      window.clearTimeout(this.debounceTimer)
      this.asrDeaf()
      try {
        this.recog.abort()
      } catch {
        /* noop */
      }
      return VOICE_MUTE_WAIT_MS
    }
    this.unmuteTimer = window.setTimeout(() => {
      this.mutedForVoice = false
      if (!this.running || !this.recog) return
      try {
        this.recog.start()
        this.asrStarting()
      } catch {
        /* まだ とまりきって いない：onend で はじめる */
      }
    }, 0)
    return 0
  }

  /** 音声認識が とまった 時刻（うごいて いる ときは 0） */
  private asrDownAt = 0
  /** iPhone・iPad：音声認識が いま 声を きける（start の 知らせ から ASR_READY_MARGIN_MS あと） */
  private asrHearing = false
  private asrHearAt = 0
  private asrReadyTimer = 0
  /** start() を よんだ：知らせ（onstart）を まち、こなければ ASR_READY_FALLBACK_MS で きける ことに する */
  private asrStarting() {
    this.sessionSound = false
    window.clearTimeout(this.asrReadyTimer)
    this.asrReadyTimer = window.setTimeout(() => this.asrReady(0), ASR_READY_FALLBACK_MS)
  }
  /** audiostart が くる ブラウザか（いちど きたら、start では きこえる ことに しない） */
  private sawAudioStart = false
  /** exact：audiostart（マイクの 音が とどいた）。それいがい（start・じかんぎれ）は まだ きめて いない ときだけ */
  private asrReady(margin: number, exact = false) {
    window.clearTimeout(this.asrReadyTimer)
    if (this.asrHearing && !exact) return
    this.asrHearing = true
    this.asrHearAt = performance.now() + margin
    this.armWindow()
  }
  private asrDeaf() {
    window.clearTimeout(this.asrReadyTimer)
    window.clearTimeout(this.windowTimer)
    this.asrHearing = false
  }

  /** ききとり窓（ASR_WINDOW_MS）：きこえる ように なった・目標が きまった ときに はじめる */
  private windowTimer = 0
  /**
   * 声の 知らせが こない ブラウザの ききとり窓。シューティングは わくが ひかったら すぐ よむので すこし みじかく できる
   * （ながいと 合格が おそく なり、みじかいと おそく よみはじめた 声が きれる）
   */
  listenWindowMs = ASR_WINDOW_NO_EVENTS_MS
  /** この 音声認識で 声の 知らせ（soundstart・speechstart）を もう つかった（1かいの 音声認識で 1かい だけ くる） */
  private sessionSound = false
  /** 声の 知らせが いちどでも きた（この ブラウザは 知らせを だす） */
  private sawSoundEvent = false
  private armWindow() {
    window.clearTimeout(this.windowTimer)
    if (!this.asrOnly || !this.target || !this.asrHearing) return
    const from = Math.max(this.asrHearAt, this.targetSetAt)
    const w = this.sawSoundEvent ? ASR_WINDOW_MS : this.listenWindowMs
    this.windowTimer = window.setTimeout(() => this.windowEnd(), Math.max(0, from + w - performance.now()))
  }
  private windowEnd() {
    if (!this.asrOnly || !this.target || this.paused || this.mutedForVoice || this.asrFinalizing || !this.asrHearing) return
    this.finalizeAsr()
  }

  /**
   * iPhone・iPad（Apple の 音声認識だけ）は、合格・マスコットの 声の たびに マイク（音声認識）を とめて また はじめるので、
   * きこえない すきま（あてて から 約1.3びょう）が ある。シューティングは その あいだ カードを とめ、きこえる ように なったら
   * ねらう カードに わくを つけて「よんで いいよ」の 合図に する（canHear）
   */
  hasMicGaps() {
    return this.switching || ((this.asrOnly || this.acoustic) && this.running)
  }
  /** いま よめば きこえるか（パソコン・Android は いつも true） */
  canHear() {
    const now = performance.now()
    if (this.switching) return false
    // こえの とうろく で きく とき：マイクが ひらいて、出だしを しらべられる だけ たって、判定を はじめて いる
    if (this.acoustic) return this.running && !this.paused && !this.micMuted && !!this.analyser && now >= this.micOpenAt + ACOUSTIC_READY_MS && now >= this.lockUntil && this.armed
    if (!this.asrOnly) return true
    // ロック（setTarget・hold）は みない：ロックは けっかが とどいた 時刻で みるので、わくが ひかって すぐ よんでも けっかは ロックの あと に とどく
    return this.running && !this.paused && this.asrHearing && !this.mutedForVoice && !this.asrFinalizing && now >= this.asrHearAt
  }
  /**
   * いま こどもが よんで いて、判定の けっかを まって いる（シューティングは カードを とめて まつ）。
   *  - パソコン・Android・iPad の 周波数解析：1もじを よむ ながさの 声が でて いる／その 発声の あと 音声認識の けっかを まって いる
   *  - iPad の 音声認識：とめて けっかを まって いる あいだ だけ（声の 知らせは 教室の ざわざわ でも くるので つかわない）
   */
  judging() {
    const now = performance.now()
    if (!this.running || this.paused || !this.target) return false
    if (this.asrOnly) return this.asrFinalizing
    if (this.speakingSince && now - this.speakingSince < 1300) return true
    if (this.pending) return true
    if (this.fuseUtt && now - this.fuseUtt.endAt < 900) return true
    return !!this.lastUttEndAt && now - this.lastUttEndAt < 900
  }

  private forceTimer = 0
  private debounceTimer = 0
  private finalizeAt = 0
  private finalizeAsr() {
    if (!this.target || this.paused) return
    this.restartAsr()
  }

  /** 音声認識を とめて すぐ また はじめる（Android は はじめる たびに 音が なるので しない） */
  private restartAsr() {
    // とめたのに 2びょう たっても おわりの 知らせ（onend）が 来ない ときは、もう いちど とめられる ように する
    if (this.asrFinalizing && performance.now() - this.finalizeAt > 2000) this.asrFinalizing = false
    if (!this.recog || this.asrFinalizing || this.mutedForVoice || isAndroid()) return
    window.clearTimeout(this.forceTimer)
    window.clearTimeout(this.debounceTimer)
    this.asrFinalizing = true
    this.finalizeAt = performance.now()
    this.asrDeaf()
    try {
      this.recog.stop()
    } catch {
      this.asrFinalizing = false
    }
  }

  /** とちゅうの けっかの あと すこし まって とめる（パソコンは 声が つづいて いる あいだ まつ） */
  private armDebounce(since: number) {
    window.clearTimeout(this.debounceTimer)
    this.debounceTimer = window.setTimeout(
      () => {
        if (!this.asrOnly && this.utt && performance.now() - since < ASR_DEBOUNCE_MAX_WAIT_MS) this.armDebounce(since)
        else this.finalizeAsr()
      },
      this.asrOnly ? ASR_DEBOUNCE_MS : ASR_DEBOUNCE_PC_MS,
    )
  }

  private lastAsrLog = ''
  /** 音声認識の 1つの けっか（こうほ ぜんぶ）を みる */
  private onAsrResult(alts: string[], final: boolean) {
    const t = this.target
    if (!t) return
    const all = this.targetsAll()
    const hit = matchTargets(all, alts, this.config.script)
    // ぼおん ごうかく：おなじ 母音の よみ（「か」に「あ」「た」）でも 合格（子音の ある 文字だけ）
    const vhit = !hit && this.vowelMode ? matchVowelTargets(all, alts, this.config.script) : null
    const top = alts[0] ?? ''
    const heard = classify(t, top, this.config.script)
    // おなじ とちゅうの けっかが なんども くる（パソコン）ので、かわった ときだけ きろくする
    const sig = `${t}|${final}|${alts.slice(0, 5).join('／')}`
    const h = hit ?? vhit
    if (sig !== this.lastAsrLog || h) {
      this.lastAsrLog = sig
      const kind = hit ? hit.kind : vhit ? 'vowelmode' : heard.kind
      this.log.add({ type: 'asr', target: t, alts: alts.slice(0, 5), final, kind: h ? `${kind}${h.kana !== t ? `:${h.kana}` : ''}${h.alt ? `#${h.alt + 1}` : ''}` : kind })
    }
    if (hit) {
      this.pending = null
      this.pass('asr', hit.kana, hit.kind === 'variant' ? 'variant' : 'asr')
      return
    }
    if (vhit) {
      this.pending = null
      this.pass('asr', vhit.kana, 'vowelmode')
      return
    }
    if (!top) return
    this.recentAsr = { text: top, heard, at: performance.now(), target: t }
    // みち④：さきに 周波数解析が よわい 子音を きいて いて、音声認識が その 母音だけ を きいた
    const f = this.fuseUtt
    if (f && f.target === t && performance.now() - f.endAt < FUSE_MS && weakHeard(t, heard)) {
      this.fuseUtt = null
      this.pass('formant', t, 'fuse')
      return
    }
    // 合格を まっているときに、ちがう 文字（「か」「あ」など）が きこえたら とりけす
    const short = !!heard.reading && isShortKana(heard.reading)
    if (this.pending && short && heard.kind !== 'match' && heard.kind !== 'variant') {
      this.pending = null
      this.log.add({ type: 'miss', target: t, alts: [top], kind: heard.kind, note: 'pending-cancel' })
      this.onMiss?.({ heard: top, kind: heard.kind, vpHelps: true })
    }
    // iPhone・iPad（音声認識だけ）：さいごの けっかが ちがう 文字 → 「合格しなかった」を しらせる（ヒント・きろくの ため）。
    // 子音の カードは こえの とうろく では よく ならないので vpHelps は false（ぼおん ごうかく では とうろく すると
    // どの カードも 周波数解析で きくので true）
    if (this.asrOnly && final && short && (heard.kind === 'vowel' || heard.kind === 'other' || heard.kind === 'confusable')) {
      const n = this.passCount
      const attempt = ++this.missAttempt
      window.clearTimeout(this.missTimer)
      this.missTimer = window.setTimeout(() => {
        if (this.target === t && this.passCount === n && this.missAttempt === attempt && !this.paused) {
          this.log.add({ type: 'miss', target: t, alts: [top], kind: heard.kind })
          this.onMiss?.({ heard: top, kind: heard.kind, vpHelps: specOf(t)?.cls === 'V' || specOf(t)?.hira === 'ん' || this.vowelMode })
        }
      }, IOS_MISS_DELAY_MS)
    }
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
    // こうほを おおく もらう（1ばんめが「あ」でも 2ばんめ いこうに「ら」が ある ことが ある）
    r.maxAlternatives = 10
    r.onresult = (e) => {
      const last = e.results.length - 1
      const latest = e.results[last]
      // 前の問題で聞きとった部分を のぞいた、新しい部分だけを見る
      const fresh = (i: number, t: string) => (i === this.asrSkip && this.asrSkipText ? stripPrefix(t, this.asrSkipText) : t)
      if (latest && latest[0]) {
        this.asrLastIdx = last
        this.asrLastText = latest[0].transcript
        this.onHeard?.(fresh(last, latest[0].transcript))
      }
      if (!this.target || this.paused || performance.now() < this.lockUntil) {
        // ロック中に聞こえた分（マスコットの声・前の問題の声）も のぞく
        this.asrSkip = Math.max(0, this.asrLastIdx)
        this.asrSkipText = this.asrLastText
        return
      }
      let sawText = false
      for (let i = Math.max(e.resultIndex, this.asrSkip); i < e.results.length; i++) {
        const res = e.results[i]
        const alts: string[] = []
        for (let j = 0; j < res.length; j++) alts.push(fresh(i, res[j].transcript))
        if (!alts.some((a) => normalize(a).compact)) continue
        sawText = true
        // とめて（stop）まって いる ときの けっかは さいごの けっか（Safari は isFinal を つけない ことが ある）
        this.onAsrResult(alts, !!res.isFinal || this.asrFinalizing)
        if (!this.target) return // 合格した
      }
      // とちゅうの けっかが 来て まだ 合格で なければ、すこし まって とめ、さいごの けっかを もらう
      if (sawText) {
        window.clearTimeout(this.debounceTimer)
        window.clearTimeout(this.windowTimer)
        this.armDebounce(performance.now())
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
    // iPhone・iPad（音声認識だけ）は 周波数解析が ないので、音声認識の「声の おわり」の 知らせで とめる。
    // 知らせが 来ない ときの ために、声が はじまって ASR_FORCE_AFTER_SOUND_MS たっても 合格して いなければ とめる
    const onVoiceStart = () => {
      if (!this.asrOnly || this.recog !== r) return
      if (!this.sawSoundEvent) {
        this.sawSoundEvent = true
        this.log.add({ type: 'info', target: this.target, note: '声の 知らせ（speechstart）が くる' })
        this.armWindow() // 知らせが くる ブラウザ：窓は あんぜんの ための ながい ほうに
      }
      if (this.sessionSound) return
      this.sessionSound = true
      window.clearTimeout(this.forceTimer)
      // 目標が なければ（チャイムなど）あたらしく する だけ（つぎの 声で また 知らせが くる ように）
      this.forceTimer = window.setTimeout(() => (this.target ? this.finalizeAsr() : this.restartAsr()), ASR_FORCE_AFTER_SOUND_MS)
    }
    const onVoiceEnd = () => {
      if (this.asrOnly) this.finalizeAsr()
    }
    r.onsoundstart = onVoiceStart
    r.onspeechstart = onVoiceStart
    r.onspeechend = onVoiceEnd
    r.onsoundend = onVoiceEnd
    r.onstart = () => {
      this.asrDownAt = 0
      if (this.recog === r && !this.sawAudioStart) this.asrReady(ASR_READY_AFTER_START_MS)
    }
    // マイクの 音が とどきはじめた（これが いちばん たしか）
    r.onaudiostart = () => {
      this.sawAudioStart = true
      if (this.recog === r) this.asrReady(ASR_READY_MARGIN_MS, true)
    }
    r.onend = () => {
      if (this.recog !== r) return // とめた あとの ふるい 音声認識
      this.asrDownAt = performance.now()
      this.asrDeaf()
      this.asrSkip = 0
      this.asrLastIdx = -1
      this.asrLastText = ''
      this.asrSkipText = ''
      window.clearTimeout(this.forceTimer)
      window.clearTimeout(this.debounceTimer)
      // じぶんで とめた ときは すぐ また はじめる（つぎの 声を ききのがさない ように）
      const quick = this.asrFinalizing
      this.asrFinalizing = false
      // はじめられなかった ときは すこし まって なんどか やりなおす（音声認識が とまった ままに ならない ように）
      const restart = (tries: number) => {
        if (!this.running || fatal || this.recog !== r || this.mutedForVoice) return
        try {
          r.start()
          this.asrStarting()
        } catch {
          if (tries < 8) window.setTimeout(() => restart(tries + 1), 150)
        }
      }
      if (this.running && !fatal) window.setTimeout(() => restart(0), quick ? 0 : 120)
    }
    try {
      r.start()
      this.recog = r
      this.asrAlive = true
      this.asrStarting()
    } catch {
      this.asrAlive = false
    }
  }
}
