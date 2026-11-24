/**
 * ハイブリッド音声判定エンジン
 *
 *  ① Web Speech API（音声認識）… 認識結果が目標の文字と一致したら即合格
 *  ② Web Audio API（AnalyserNode）… 母音フォルマントの帯域エネルギー比で判定
 *     4 フレーム（約 92ms）続けて目標母音の特徴に合致したら合格
 *
 * 子どもの短い単母音は音声認識だけだと無視されやすいので、②を並行して動かします。
 */
import { KANA_INFO, isMulti, type Kana, type Vowel } from '../data/kana'
import { VOWEL_ORDER, meanShape, modelProbs, personalProbs, updateNoise, vowelFeature } from './vowelClassifier'
import { getAudioContext, setMicActive } from './audio'
import { isFricativeRomaji, soundsVoiceless, voicingInfo } from './voicing'

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

/**
 * ひとつの発声が、目標の母音を読んだものかどうか。
 * 子音や出だしをのぞいた後ろの2/3（母音のところ）で、5つの母音の確率を平均し、
 * 目標の母音がいちばん高く、しかも一定以上（50%）のときだけ合格。
 */
/** 発声の 後ろ2/3 の 確率の平均（0〜4：あいうえお、5：ん） */
export function utteranceAvg(probs: number[][]) {
  const tail = probs.slice(Math.floor(probs.length * 0.34))
  const m = probs[0]?.length ?? 5
  const avg = new Array<number>(m).fill(0)
  for (const p of tail) for (let i = 0; i < m; i++) avg[i] += p[i] / tail.length
  return avg
}

/**
 * 周波数解析での 合格（スペシャルモーラ）
 *  - iPhone・iPad で こえの とうろく が ある ときだけ、1つの 音の カード（が・ぱ・きゃ など）で つかう（ことばの カードは 音声認識）。
 *    iPhone・iPad は 音声認識と マイクを とりあうので、とうろく が ある 1つの 音の カードは 音声認識の かわりに これで きく。
 *    パソコン・Android（音声認識が いっしょに うごく）と、とうろく が ない ときは、これまでどおり 音声認識だけで 合格を きめる
 *    （「が」に「あ」で 合格して しまうため：2026-11-23。にごりの 判定も ほかの 声では まだ たしかでない：voicing.ts）
 *  - 濁音（が・ざ・だ・ば行、ぎゃ・じゃ・びゃ行）は、母音に くわえて 子音で 声帯が ふるえて いるか（voicing.ts）も みる。
 *    「が」を「か」と 読んだら 合格に しない。「あ」だけ と「が」は 見わけられない
 * 2026-11-24：iPad で 声の 高い 女の子が 1つの 音の カードで まったく 合格しなかった（音声認識が みじかい 1音を ききとれない）
 */
const VOICED_ROMAJI = /^(g|z|j|d|b)/
export const isVoicedKana = (k: Kana) => VOICED_ROMAJI.test(KANA_INFO[k]?.romaji ?? '')
/** 拗音（きゃ・しゅ など）：「い」の くちから うつるので 母音の みかたを かえる（singleVowelOk） */
const isYouon = (k: Kana) => /[ゃゅょ]/.test(k)
/** 1つの 音の カードの 発声の みじかさの 下限（約0.09びょう。こえの 高い 子の「が」は 0.12びょう ほど） */
const SINGLE_MIN_FRAMES = 4

export function utteranceMatches(target: Vowel, probs: number[][], minProb = UTT_MIN_PROB, minFrames = UTT_MIN_FRAMES): boolean {
  const n = probs.length
  if (n < minFrames || n > UTT_MAX_FRAMES) return false
  const avg = utteranceAvg(probs)
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
  // 濁音・半濁音
  が: ['蛾', '画', '我', 'ga'], ぎ: ['義', '技', '儀', 'gi'], ぐ: ['具', 'gu', 'goo'], げ: ['下', '外', 'ge'], ご: ['五', '語', '碁', '後', '御', '5', 'go'],
  ざ: ['座', 'za'], じ: ['字', '時', '次', '地', '痔', '児', 'ぢ', 'ji', 'g'], ず: ['図', '頭', 'づ', 'zu'], ぜ: ['是', 'ze'], ぞ: ['象', 'zo'],
  だ: ['駄', 'da'], ぢ: ['じ', '字', '時', '地', 'ji', 'g'], づ: ['ず', '図', '頭', 'zu'], で: ['出', 'de'], ど: ['度', '土', '努', 'do'],
  ば: ['場', '馬', 'ba'], び: ['美', '微', 'b', 'bi'], ぶ: ['部', '分', '武', 'bu'], べ: ['be'], ぼ: ['bo'],
  ぱ: ['pa'], ぴ: ['p', 'pi', 'pea'], ぷ: ['pu', 'poo'], ぺ: ['pe'], ぽ: ['po'],
  // 拗音
  きゃ: ['kya'], きゅ: ['九', '急', '級', '球', '旧', '9', 'q', 'kyu', 'cue'], きょ: ['今日', '巨', '許', '居', '虚', 'kyo'],
  しゃ: ['社', '車', '者', '舎', 'sha'], しゅ: ['手', '主', '種', '酒', '朱', '守', 'shu', 'shoe'], しょ: ['書', '所', '初', '諸', 'sho', 'show'],
  ちゃ: ['茶', 'cha'], ちゅ: ['中', '注', 'chu'], ちょ: ['著', 'cho'],
  にゃ: ['nya'], にゅ: ['入', 'new', 'nyu'], にょ: ['女', 'nyo'],
  ひゃ: ['百', '100', 'hya'], ひゅ: ['hyu', 'hugh'], ひょ: ['表', '票', '豹', 'hyo'],
  みゃ: ['脈', 'mya'], みゅ: ['mu', 'myu'], みょ: ['妙', 'myo'],
  りゃ: ['略', 'rya'], りゅ: ['竜', '龍', '流', '留', 'ryu'], りょ: ['旅', '両', '量', '漁', 'ryo'],
  ぎゃ: ['逆', 'gya'], ぎゅ: ['牛', 'gyu'], ぎょ: ['魚', '漁', '行', 'gyo'],
  じゃ: ['蛇', '邪', 'ja'], じゅ: ['十', '重', '中', '10', 'ju', 'jew'], じょ: ['女', '序', '除', '助', 'jo', 'joe'],
  びゃ: ['bya'], びゅ: ['byu'], びょ: ['秒', '病', 'byo'],
  ぴゃ: ['pya'], ぴゅ: ['pyu'], ぴょ: ['pyo'],
  // 長音
  おかあさん: ['お母さん', '母さん'], おにいさん: ['お兄さん', '兄さん'], ふうせん: ['風船'], おねえさん: ['お姉さん', '姉さん'], こおり: ['氷'],
  おとうさん: ['お父さん', '父さん'], ぼうし: ['帽子'], とけい: ['時計'], せんせい: ['先生'],
  // 撥音
  みかん: ['蜜柑'], りんご: ['林檎'], ほん: ['本'], きりん: ['麒麟'], かばん: ['鞄', '鞄ん'], てんとうむし: ['天道虫', 'てんとう虫', '天とう虫'], えんぴつ: ['鉛筆'], ぱんだ: [],
  // 拗長音
  きゅうり: ['胡瓜'], ぎゅうにゅう: ['牛乳'], きょうりゅう: ['恐竜'], ちょうちょ: ['蝶々', '蝶蝶', 'ちょうちょう', '蝶'], しょうぼうしゃ: ['消防車'],
  じょうろ: ['如雨露'], びょういん: ['病院', '美容院'], ちゅうしゃ: ['注射', '駐車'], りゅう: ['竜', '龍', '流'], ひょう: ['豹', '表', '票', '雹'],
  // 促音
  きって: ['切手', '来て'], らっぱ: ['喇叭'], こっぷ: [], ねっこ: ['根っこ'], しっぽ: ['尻尾'], いっぱい: ['一杯'], がっこう: ['学校'], はっぱ: ['葉っぱ'], しっぱい: ['失敗'], らっこ: ['海獺'],
}

function toHiragana(s: string) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

/** のばす「ー」は くらべない（「おかーさん」も「おかあさん」と おなじ） */
const noBar = (s: string) => s.replace(/ー/g, '')

function oneMatches(target: Kana, t: string): boolean {
  if (!t) return false
  if (t === target || noBar(t) === noBar(target)) return true
  if (t.length === target.length * 2 && t === target + target) return true // 「がが」「きゃきゃ」
  if (t.length <= target.length + 2 && t.startsWith(target) && /^[ぁ-ゖ]+$/.test(t) && /^[あいうえおんー]*$/.test(t.slice(target.length))) return true // 「がー」「きゃあ」
  const r = KANA_INFO[target]?.romaji
  if (r && t === r) return true
  const h = HOMOPHONES[target] ?? []
  return h.includes(t) || h.some((x) => toHiragana(x) === t)
}

export function transcriptMatches(target: Kana, raw: string): boolean {
  const base = toHiragana(raw.normalize('NFKC').toLowerCase())
  // 「っ」「ー」は ことばの 一部なので のこす（らっぱ・おかあさん）
  const whole = base.replace(/[\s、。．.,!！?？〜~「」]/g, '')
  if (oneMatches(target, whole)) return true
  // 前の声とつながって返ってきたとき（「さ か」など）は、最後のことばで くらべる
  const words = base.split(/[\s、。．.,!！?？]+/).map((w) => w.replace(/[〜~「」]/g, '')).filter(Boolean)
  if (words.length > 1 && oneMatches(target, words[words.length - 1])) return true
  // 区切りなしで つながったとき（「かきく」）は、最後の1文字
  if (/^[ぁ-ゖー]{2,12}$/.test(whole) && whole.length > target.length && noBar(whole).endsWith(noBar(target))) return true
  // ことばの カード：前の ことばと つながって かえってきても、さいごが その ことば（漢字・カタカナでも）なら 合格
  if (target.length >= 2) {
    const forms = [target, ...(HOMOPHONES[target] ?? []).filter((x) => x.length >= 2)].map((x) => noBar(toHiragana(x)))
    if (forms.some((f) => noBar(whole).endsWith(f))) return true
  }
  return false
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

/**
 * 前の 波形 prev から いまの 波形 cur までに 何サンプル すすんだか（cur[i] = prev[i + d] と なる d）。
 * いくつも あう（無音など）ときは 時計から みた want に いちばん ちかい もの。みつからなければ -1（ローマ字フローラちゃんと おなじ）
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
  private utt: { feats: number[][]; levels: number[]; silent: number; run: number; top: number; startSample: number } | null = null
  // マイクの 生の 波形（直近 3びょう）。子音の にごりを しらべる のに つかう
  private ring = new Float32Array(0)
  private prevTime = new Float32Array(0)
  private sampleCount = 0
  private lastTickAt = 0
  private gapAt = -1
  /** さいごに しらべた 子音の にごり（テスト・保護者向けの 説明用） */
  lastVoicing: { prom: number; unv: number; voiceless: boolean } | null = null
  /** 登録した その子の「あいうえお」の形（なければ学習モデルで判定） */
  private voiceprint: number[][] | null = null
  private captureCb: ((shape: number[] | null) => void) | null = null
  private captureRatio = 5

  onPass: ((source: PassSource) => void) | null = null
  onFrame: ((f: FrameInfo) => void) | null = null
  onStatus: ((s: MicStatus, asr: boolean) => void) | null = null
  /** うまくいかなかったときの理由（保護者向けの説明に使う） */
  lastError = ''

  static supported() {
    return !!navigator.mediaDevices?.getUserMedia
  }

  async start(): Promise<MicStatus> {
    // テスト用：状態を見られるようにする
    const dw = window as unknown as { __yomeDebug?: boolean; __judge?: unknown }
    if (dw.__yomeDebug) dw.__judge = this
    this.paused = false
    if (this.running) return 'listening'
    // iPhone/iPad：音声認識（Apple）と周波数解析が同じマイクを取りあうので、音声認識だけで判定する
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
    // こえの とうろく があっても 音声認識で判定する（周波数解析は母音しか聞かず「さ」に「あ」で合格してしまうため。11月6日より前の判定にもどす：2026-11-23）
    if (isIOS() && !this.forceAnalyser && !this.iosAsrFailed && !this.iosAcoustic(this.target) && (w.SpeechRecognition || w.webkitSpeechRecognition)) {
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
    this.analyser.minDecibels = -130
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

  /** iPhone・iPad で この カードを 周波数解析で 判定するか（こえの とうろく が あって、1つの 音の カード） */
  private iosAcoustic(k: Kana | null) {
    return (isIOS() || this.acousticAnywhere) && !!this.voiceprint && !!k && !isMulti(k)
  }
  /** テスト用：iPhone・iPad で なくても 周波数解析で 合格に する */
  acousticAnywhere = false

  /** iPhone・iPad：カードの しゅるいが かわったら 音声認識 ⇄ 周波数解析 を きりかえる */
  private switching = false
  private async switchMode() {
    if (this.switching) return
    this.switching = true
    const onStatus = this.onStatus
    this.onStatus = null // 画面の マイクの 表示は そのまま（いったん とめて すぐ つける）
    try {
      this.stop()
      await this.start()
    } finally {
      this.onStatus = onStatus
      this.switching = false
      this.onStatus?.(this.running ? 'listening' : 'idle', this.asrAlive)
    }
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
    this.asrSkip = Math.max(0, this.asrLastIdx)
    this.asrSkipText = this.asrLastText
    this.asrMissAt = 0
    // iPhone・iPad：音声認識 と 周波数解析の どちらで きくかが かわる カードなら きりかえる
    if (this.running && k && isIOS() && !this.forceAnalyser && !this.iosAsrFailed && this.iosAcoustic(k) === this.asrOnly) void this.switchMode()
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

  /** その子の「あいうえお」を使う（null で学習モデルにもどす） */
  setVoiceprint(C: number[][] | null) {
    this.voiceprint = C
  }

  /** 声の登録：次の1回の発声の形を受けとる（問題は出さない） */
  capture(cb: (shape: number[] | null) => void, lockMs = 400, minRatio = 5) {
    this.captureRatio = minRatio
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

  /** 先生の一時停止：判定を止める（resume で もどす） */
  paused = false
  pause() {
    this.paused = true
    this.utt = null
  }
  resume(lockMs = 400) {
    this.paused = false
    this.utt = null
    this.lockUntil = performance.now() + lockMs
  }

  private passCount = 0
  /** 読んだのに合格しなかった発声ごとに よばれる（その ときの カード） */
  onMiss?: (k: Kana) => void

  private pass(source: PassSource) {
    if (!this.target || this.paused) return
    this.passCount++
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
    this.appendSamples()

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
    if (!this.armed) {
      // 前の声が途切れる（または一定時間たつ）まで待ってから判定を始める
      this.quietFrames = voiced ? 0 : this.quietFrames + 1
      if (now >= this.lockUntil && (this.quietFrames >= 3 || now - this.targetSetAt > 900)) this.armed = true
    }

    const feat = voiced ? vowelFeature(this.freq, this.analyser!.context.sampleRate / this.analyser!.fftSize, this.noiseSpec) : null
    const probs = feat ? this.probsOf(feat) : null
    const tv = this.target ? VOWEL_ORDER.indexOf(KANA_INFO[this.target]?.vowel ?? 'あ') : -1
    const match = !!probs && tv >= 0 && probs.indexOf(Math.max(...probs)) === tv
    const listening = !this.paused && this.armed && now >= this.lockUntil && (!!this.target || !!this.captureCb)

    // 発声の なかで いちばん大きい声より ずっと小さい音（-26dB）は、すきま として あつかう。
    // こどもの こえの まわりに 小さな音（おとなの こえ・いき・すすりなき）が つづいていても、1もじずつ くぎれる
    const inGap = !!this.utt && this.utt.top > 0 && rms < this.utt.top * UTT_GAP_RATIO

    // 発声ごとに判定する（声が止まったところで、その発声全体を見て決める）
    if (listening && voiced && !inGap) {
      if (!this.utt) this.utt = { feats: [], levels: [], silent: 0, run: 0, top: 0, startSample: this.sampleCount - this.time.length }
      const u = this.utt
      u.silent = 0
      if (feat) {
        u.feats.push(feat)
        u.levels.push(rms)
        u.top = Math.max(u.top, rms)
      }
      // 長すぎる「声」は 古いほうから すてる（すてきると、まわりの音の あとに よんだ 声まで きれてしまうため）
      if (u.feats.length > UTT_MAX_FRAMES * 2) {
        u.feats.shift()
        u.levels.shift()
        u.top = Math.max(0, ...u.levels)
      }
      u.run = match ? u.run + 1 : 0
    } else if (this.utt) {
      this.utt.silent++
      if (!listening) this.utt = null
      else if (this.utt.silent >= UTT_END_FRAMES) {
        const u = this.utt
        this.utt = null
        this.uttCount++
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
          return
        }
        // ながさは「いちばん大きい まとまり」で みる。ほかに おなじくらい 大きい音が ある（おしゃべり）なら 判定しない
        const lenOk = runLen >= UTT_MIN_FRAMES && runLen <= UTT_MAX_FRAMES && r.others === 0
        const nOk = this.target === 'ん' && lenOk && core.length >= 3 ? this.nMatches(core) : null
        if ((window as unknown as { __yomeDebug?: boolean }).__yomeDebug && this.voiceprint)
          console.log('UTT', this.target, u.feats.length, core.length, utteranceAvg(core.map((f) => personalProbs(f, this.voiceprint!))).map((v) => v.toFixed(2)).join(' '), nOk)
        // 周波数解析での 合格（iPhone・iPad で こえの とうろく が ある とき、1つの 音の カードだけ。VOICED_ROMAJI の うえの せつめい）
        const lenOkS = runLen >= SINGLE_MIN_FRAMES && runLen <= UTT_MAX_FRAMES && r.others === 0
        const coreLv = runLevels.filter((v) => v >= top * RUN_CORE_RATIO)
        if (this.target && this.iosAcoustic(this.target) && lenOkS && this.acousticMatches(this.target, core, coreLv, u.startSample)) {
          this.onFrame?.({ bands, voiced, match: true, streak: STREAK_TO_PASS })
          this.pass('formant')
          return
        }
        // 読んだのに 合格しなかった（音声認識が あとから 合格にすることもあるので 少し待ってから知らせる）
        if (this.target && (lenOk || (lenOkS && !isMulti(this.target))) && !this.paused) {
          const t = this.target
          const n = this.passCount
          window.setTimeout(() => {
            if (this.target === t && this.passCount === n && !this.paused) this.onMiss?.(t)
          }, 1500)
        }
      }
    }
    this.streak = this.utt?.run ?? 0
    this.onFrame?.({ bands, voiced, match, streak: Math.min(this.streak, STREAK_TO_PASS) })
  }


  /**
   * 1つの 音の カードを 周波数解析で 合格に するか（iPhone・iPad で こえの とうろく が ある とき）。
   *  ① 母音（singleVowelOk）
   *  ② 濁音は 子音の にごり：「か・さ・た・は・ぱ」の ように 声帯が ふるえない 息や 強い 破裂が あれば 不合格
   */
  private acousticMatches(t: Kana, core: number[][], levels: number[], startSample: number) {
    if (!this.singleVowelOk(t, core, levels)) return false
    if (!isVoicedKana(t)) return true
    const sr = this.analyser!.context.sampleRate
    const from = startSample - Math.round(sr * 0.25)
    // 音が ぬけた（tick が おくれた）ところは しらべられないので 合格に しない
    if (this.gapAt >= from) return false
    const v = voicingInfo(this.samples(from, this.sampleCount), sr)
    const fric = isFricativeRomaji(KANA_INFO[t]?.romaji ?? '')
    this.lastVoicing = v ? { prom: v.prom, unv: v.unv, voiceless: soundsVoiceless(v, fric) } : null
    if ((window as unknown as { __yomeDebug?: boolean }).__yomeDebug) console.log('VOICING', t, JSON.stringify(this.lastVoicing))
    return !!v && !this.lastVoicing!.voiceless
  }

  /**
   * 1つの 音の カードの 母音。みじかい 1音（0.1〜0.2びょう）は、出だし（子音から 母音への うつりかわり）と
   * おわり（声が よわまって「う」の ように なる）が 長さの わりに 多いので、
   *  - 出だしの 1/3 は のぞき、のこりは 大きい フレームほど おもく（母音の まんなかを 重く）みる
   *  - その子の「あいうえお」（とうろく）と 学習モデルの どちらかで 目標の 母音が いちばん 高く 35% いじょう なら よい
   *    （とうろくは 別の日の ながい 母音なので ずれる ことが ある：声の 高い 子の「ぎ」は とうろくだと う、学習モデルだと い）
   *  - 拗音（ゃ・ゅ・ょ）は「い」の くちから うつるので、あ が え に、う が い に よって きこえる。拗音の カードに
   *    え段・い段 は ないので、え は あ に、い は う に たして みる
   */
  private singleVowelOk(t: Kana, core: number[][], levels: number[]) {
    const k = VOWEL_ORDER.indexOf(KANA_INFO[t]?.vowel ?? 'あ')
    const ok = (probOf: (f: number[]) => number[], name: string) => {
      const avg = [0, 0, 0, 0, 0]
      let wsum = 0
      // 出だしの 1/3（子音から 母音への うつりかわり）は のぞく
      const from = Math.floor(core.length * 0.34)
      core.forEach((f, i) => {
        if (i < from) return
        const w = levels[i] ?? 1
        const p = probOf(f)
        for (let j = 0; j < 5; j++) avg[j] += w * p[j]
        wsum += w
      })
      for (let j = 0; j < 5; j++) avg[j] /= Math.max(wsum, 1e-9)
      if (isYouon(t)) {
        avg[0] += avg[3]
        avg[2] += avg[1]
        avg[1] = avg[3] = 0
      }
      if ((window as unknown as { __yomeDebug?: boolean }).__yomeDebug) console.log('VOWEL', name, t, avg.map((v) => v.toFixed(2)).join(' '))
      return avg.every((v, i) => i === k || v < avg[k]) && avg[k] >= 0.35
    }
    return ok((f) => personalProbs(f, this.voiceprint!.slice(0, 5)), 'とうろく') || ok(modelProbs, 'モデル')
  }

  /** AnalyserNode の 時間波形から、前の tick いこうの あたらしい 音だけを つなぐ（ローマ字フローラちゃんと おなじ） */
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
    // 前の 波形と かさなる ところを さがして、ほんとうに すすんだ ぶんだけ つなぐ
    // （音は 10〜20ms ずつ まとめて とどくので、時計から きめると 音が だぶったり ぬけたりして、子音の 形が こわれる）
    let n = this.lastTickAt ? audioAdvance(this.prevTime, this.time, want) : N
    if (n < 0) {
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

  /** iPhone・iPad（音声認識だけ）：目標と ちがう ことばを きいたら、少し まって 合格しなければ「読んだのに 合格しない」と しらせる */
  private asrMissAt = 0
  private asrMiss() {
    const t = this.target
    const n = this.passCount
    const now = performance.now()
    if (!t || now - this.asrMissAt < 1500) return
    this.asrMissAt = now
    window.setTimeout(() => {
      if (this.target === t && this.passCount === n && !this.paused) this.onMiss?.(t)
    }, 1500)
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
        // ロック中に聞こえた分（ずんだもんの声・前の問題の声）も のぞく
        this.asrSkip = Math.max(0, this.asrLastIdx)
        this.asrSkipText = this.asrLastText
        return
      }
      for (let i = Math.max(e.resultIndex, this.asrSkip); i < e.results.length; i++) {
        const alts = e.results[i]
        for (let j = 0; j < alts.length; j++) {
          const t = fresh(i, alts[j].transcript)
          if (this.target && t && transcriptMatches(this.target, t)) {
            this.pass('asr')
            return
          }
        }
      }
      // iPhone・iPad は 周波数解析が ないので、ここで「読んだのに 合格しない」を しらせる（こえの とうろく を すすめる ため）
      if (this.asrOnly && latest?.[0] && fresh(last, latest[0].transcript).trim()) this.asrMiss()
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
      this.asrSkip = 0
      this.asrLastIdx = -1
      this.asrLastText = ''
      this.asrSkipText = ''
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
