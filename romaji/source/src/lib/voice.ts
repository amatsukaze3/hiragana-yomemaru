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
import { VOWEL_ORDER, meanShape, modelProbs, personalProbs, updateNoise, vowelFeature } from './vowelClassifier'
import { getAudioContext, onFloraVoice, setMicActive } from './audio'
import { ONSET_CLASSES, onsetClassOf, onsetFeatures, onsetProbs, onsetScore, type OnsetClass } from './onset'

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
/** 母音と 子音で 合格したとき、音声認識の けっかを まつ じかん（ms） */
const ASR_WAIT_MS = 500
/**
 * 音声認識の けっかを はやく だす：声が おわったら（または 声が はじまって この 時間が たったら）音声認識を いったん とめる。
 * とめると、そこまでの 音の けっか（final）が すぐ かえってくる（とめないと 2〜3びょう かかる。iPad で 約3びょう）。とめたら すぐ また はじめる
 */
const ASR_FORCE_AFTER_SOUND_MS = 900
const ASR_DEBOUNCE_MS = 250
// パソコン：とちゅうの けっかが 来て この時間 あたらしい けっかが なければ とめる（声が つづいて いる あいだは まつ。さいだい ASR_DEBOUNCE_MAX_WAIT_MS）
const ASR_DEBOUNCE_PC_MS = 300
const ASR_DEBOUNCE_MAX_WAIT_MS = 1200
// 音声認識が とまった まま うごいて いなければ、この時間で もう いちど はじめる
const ASR_WATCHDOG_MS = 2500
// iPhone・iPad：フローラちゃんが しゃべる まえに マイク（音声認識）を とめて まつ 時間
const VOICE_MUTE_WAIT_MS = 200
// iPhone・iPad：マイクの 音が とどきはじめた 知らせ（audiostart）から ほんとうに きこえる ように なるまでの よゆう
const ASR_READY_MARGIN_MS = 100
// audiostart が こない ときは、はじまった 知らせ（start）から この時間で きこえる ことに する
const ASR_READY_AFTER_START_MS = 400
// どちらの 知らせも こない ときは start() から この時間で きこえる ことに する
const ASR_READY_FALLBACK_MS = 1000
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
const HOMOPHONES: Record<string, string[]> = {
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
  む: ['無', '六', '夢', '務', '武', '鵡', '6', 'μ', 'moo', 'mu'],
  め: ['目', '芽', '女', '雌', 'me'],
  も: ['藻', '喪', '茂', 'mo'],
  や: ['矢', '屋', '夜', '八', '野', '哉', '8', 'ya'],
  ゆ: ['湯', '油', '由', 'u', 'you', 'yu'],
  よ: ['世', '夜', '四', '代', '余', '予', '与', 'yo'],
  ら: ['等', '羅', '良', '裸', '螺', '拉', 'la', 'rah', 'ra'],
  り: ['利', '理', '里', '李', '梨', '吏', '離', '裏', '璃', '履', 'li', 'lee', 'ree', 'ri'],
  る: ['留', '流', '瑠', 'lu', 'rue', 'ru'],
  れ: ['礼', '例', '零', '霊', '令', '冷', '麗', '齢', 'le', 'ray', 'rei', 're'],
  ろ: ['炉', '路', '六', '呂', '露', '櫓', '老', '労', '郎', '朗', '廊', '楼', '蝋', 'lo', 'low', 'row', 'law', 'roe', 'ro'],
  わ: ['輪', '和', '話', '環', 'は', 'wa'],
  を: ['お', '尾', '緒', '御', 'o', 'oh', 'wo'],
  ん: ['うん', 'ん', 'n', 'm'],
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
 * よわい 子音（ま行・な行・ら行）を、音声認識が その母音だけに ききまちがえた（「む」→「う」「ん」「うん」、「ら」→「あ」）。
 * 出だしの 学習モデルが 子音を はっきり きいて いれば 合格に する ときに つかう
 */
function weakMisheard(target: Kana, heard: string, cls: OnsetClass) {
  const v = KANA_INFO[target]?.vowel
  if (!v || (cls !== 'N' && cls !== 'R')) return false
  return [...heard].every((c) => c === v || c === 'ー' || (cls === 'N' && c === 'ん'))
}

/** ら行の はじきの 音は「だ」「で」「ど」に きこえやすい（こどもの「ら」は とくに） */
const FLAP_AS_D: Record<string, string> = { ら: 'だ', れ: 'で', ろ: 'ど' }

/** ら・れ・ろ を「だ・で・ど」と きいても 合格（子音は きこえて いるので、母音だけの よみでは ない） */
export function flapMatches(kana: Kana, raw: string): boolean {
  const d = FLAP_AS_D[toHiragana(kana)]
  if (!d) return false
  const whole = toHiragana(raw.normalize('NFKC').toLowerCase()).replace(/[\s、。．.,!！?？〜~ーっ「」]/g, '')
  return oneMatches(d, whole)
}

/** みじかい かなの ことば（1もじを よんだ 音声認識の けっか：あ・ああ・か・かあ など） */
function isShortKana(t: string) {
  return /^[ぁ-ゖー]{1,3}$/.test(t)
}

function toHiragana(s: string) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

/** h：目標の文字を ひらがなに したもの（カタカナの 認識結果も ひらがなに なおして くらべる） */
function oneMatches(h: string, t: string, r?: string): boolean {
  if (!t) return false
  if (t === h) return true
  if ([...t].every((c) => c === h)) return true // 「ああ」「あーあ」
  if (t.length <= 3 && t.startsWith(h) && /^[ぁ-ゖ]+$/.test(t) && /^[あいうえおぁぃぅぇぉんー]*$/.test(t.slice(1))) return true // 「かあ」「かん」「むぅ」
  if (r && t === r) return true
  return (HOMOPHONES[h] ?? []).includes(t)
}

export function transcriptMatches(kana: Kana, raw: string): boolean {
  // カタカナの 目標は ひらがなに なおして くらべる（音声認識は ひらがな・カタカナ・漢字の どれでも かえすため）
  const target = toHiragana(kana)
  const romaji = KANA_INFO[kana]?.romaji
  const oneMatches_ = (t: string) => oneMatches(target, t, romaji)
  const base = toHiragana(raw.normalize('NFKC').toLowerCase())
  const whole = base.replace(/[\s、。．.,!！?？〜~ーっ「」]/g, '')
  if (oneMatches_(whole)) return true
  // 前の声とつながって返ってきたとき（「さ か」など）は、最後のことばで くらべる
  const words = base.split(/[\s、。．.,!！?？]+/).map((w) => w.replace(/[〜~ーっ「」]/g, '')).filter(Boolean)
  if (words.length > 1 && oneMatches_(words[words.length - 1])) return true
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
  private utt: { feats: number[][]; levels: number[]; silent: number; run: number; top: number; startSample: number; startAt: number } | null = null
  // 子音を しらべるための、ちょくぜん 約3びょうの 音（AnalyserNode の 時間波形を つないだもの）
  private ring = new Float32Array(0)
  private prevTime = new Float32Array(0)
  private sampleCount = 0
  private lastTickAt = 0
  /** あ行で 合格に する まえに、音声認識が ちがう 文字を きいて いないか まつ（時間切れで 合格） */
  private pending: { target: Kana; until: number } | null = null
  /** さいごの 発声の 子音の なかまの 確率（テスト・ログ用） */
  lastOnset: { probs: number[]; cls: string } | null = null
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
    // iPhone/iPad：音声認識（Apple）と周波数解析が同じマイクを取りあうので、音声認識だけで判定する。
    // ローマ字フローラちゃんは こえの とうろく が あっても 音声認識（周波数解析は 母音しか わからず「ka」に「あ」で 合格して しまうため。2026-11-23）
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
    if (isIOS() && !this.forceAnalyser && !this.iosAsrFailed && (w.SpeechRecognition || w.webkitSpeechRecognition)) {
      this.asrOnly = true
      this.lastError = ''
      this.running = true
      this.startAsr()
      if (this.asrAlive) {
        this.unsubVoice?.()
        this.unsubVoice = onFloraVoice((s) => this.floraVoice(s))
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

  stop() {
    this.running = false
    this.asrOnly = false
    this.asrDeaf()
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
    if (had) setMicActive(false)
    this.onStatus?.('idle', false)
  }

  /** 出題する文字を変える。前の声の残りで誤合格しないよう、少しの間ロックする */
  setTarget(k: Kana | null, lockMs = 300) {
    this.utt = null
    this.pending = null
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
    // iPhone・iPad：まえの 問題で きいた ことばが のこって いたら（合格いがいで つぎへ すすんだ とき）、あたらしく する。
    // のこった ままだと、Apple の 音声認識が つぎの 文字と つなげて ことばに かきかえて しまう（pass の せつめい）
    if (k && this.asrOnly && this.asrLastText) this.restartAsr()
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
    this.pending = null
    this.lockUntil = Math.max(this.lockUntil, performance.now() + ms)
    this.streak = 0
  }

  /** 先生の一時停止：判定を止める（resume で もどす） */
  paused = false
  pause() {
    this.paused = true
    this.utt = null
    this.pending = null
  }
  resume(lockMs = 400) {
    this.paused = false
    this.utt = null
    this.lockUntil = performance.now() + lockMs
  }

  private passCount = 0
  /** 読んだのに合格しなかった発声ごとに よばれる */
  onMiss?: () => void

  private pass(source: PassSource) {
    if (!this.target || this.paused) return
    this.passCount++
    this.target = null
    this.streak = 0
    // 合格したら 音声認識を あたらしく しなおす（つぎの 文字の けっかが まえの 文字に つながらない ように）
    //  - パソコン：つながると おそく なる
    //  - iPhone・iPad（2026-11-24）：おなじ 音声認識の まま つぎの 文字を よむと、Apple の 音声認識が まえの 文字と
    //    つなげて ことばに かきかえて しまう（か＋き →「柿」、す＋し →「寿司」）。すると 2もじめ いこうは 1かいめで とおらず、
    //    いいなおすと（音声認識が あたらしく なって）とおる。合格の チャイムと つぎの 文字が でるまでの あいだに あたらしく する
    this.restartAsr()
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
      this.pending = null
      this.pass('formant')
    }
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
      if (!this.utt) this.utt = { feats: [], levels: [], silent: 0, run: 0, top: 0, startSample: this.sampleCount - this.time.length, startAt: now }
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
        // 登録があれば その子の声とくらべて 45%以上、なければ学習モデルで 50%以上
        // （音声認識が動いているときの学習モデルは、より はっきりした 60%以上）
        const thr = this.voiceprint ? 0.45 : this.asrAlive ? 0.6 : UTT_MIN_PROB
        // ながさは「いちばん大きい まとまり」で みる。ほかに おなじくらい 大きい音が ある（おしゃべり）なら 判定しない
        const lenOk = runLen >= UTT_MIN_FRAMES && runLen <= UTT_MAX_FRAMES && r.others === 0
        const nOk = this.target === 'ン' && lenOk && core.length >= 3 ? this.nMatches(core) : null
        if ((window as unknown as { __yomeDebug?: boolean }).__yomeDebug && this.voiceprint)
          console.log('UTT', this.target, u.feats.length, core.length, utteranceAvg(core.map((f) => personalProbs(f, this.voiceprint!))).map((v) => v.toFixed(2)).join(' '), nOk)
        const dump = (globalThis as unknown as { __onsetDump?: number[][] }).__onsetDump
        if (dump && lenOk) {
          const sr = this.analyser!.context.sampleRate
          const o = onsetFeatures(this.samples(u.startSample - Math.round(sr * 0.25), this.sampleCount), sr)
          if (o) dump.push([u.top, ...o.feat])
        }
        const vowelOk = !!this.target && lenOk && (nOk ?? utteranceMatches(KANA_INFO[this.target]?.vowel ?? 'あ', core.map((f) => this.probsOf(f)), thr, 3))
        // ローマ字フローラちゃんの 判定：子音と 母音の 両方が あって はじめて 合格（母音だけの よみは 合格に しない）
        //  - 音声認識が 目標の 文字を きいたら 合格（startAsr。子音も 母音も わかる）
        //  - 周波数解析（ここ）は 母音しか わからないので、つぎの ときだけ 合格に する：
        //    ・出だしの 学習モデル（onset.ts）で 目標の 子音が はっきり きこえた（母音だけの よみが こえるのは 2% いか）
        //    ・あ行・を は、子音っぽく なく、音声認識が ちがう 文字を きいて いなければ 合格（0.7びょう まって たしかめる）
        //    ・ん は これまでどおり
        //  - この 発声で 音声認識が ちがう 文字（「あ」「さ」など）を きいていたら 不合格
        if (vowelOk && this.target) {
          const t = this.target
          // この 発声で 音声認識が きいた ちがう 文字（なければ null）
          const heard = this.asrAlive ? this.heardOtherText(t, u.startAt) : null
          const cls = onsetClassOf(KANA_INFO[t]?.romaji ?? '')
          let ok: 'now' | 'wait' | 'no'
          if (!cls) ok = heard ? 'no' : 'now' // ん
          else {
            const o = this.onsetScoreOf(cls, u.startSample)
            const fast = !!o && o.score >= o.fast
            if (heard) {
              // ま行・な行・ら行（m・n・r）は 音声認識が「う」「ん」「あ」と ききまちがえやすい。
              // 出だしの 学習モデルが 子音を はっきり きいて いれば 合格（母音だけの よみが こえるのは 2% いか）
              ok = fast && weakMisheard(t, heard, cls) ? 'now' : 'no'
            } else if (fast) ok = 'now'
            else if (cls === 'V' && (!o || o.score >= o.loose)) ok = this.asrAlive ? 'wait' : 'now'
            else ok = 'no' // 子音の 文字は 音声認識が 合格に するのを まつ
          }
          if (ok !== 'no') {
            this.onFrame?.({ bands, voiced, match: true, streak: STREAK_TO_PASS })
            if (ok === 'wait') {
              this.pending = { target: t, until: now + ASR_WAIT_MS }
              // 音声認識の さいごの けっかを はやく もらって たしかめる
              this.finalizeAsr()
            } else this.pass('formant')
            return
          }
        }
        // 読んだのに 合格しなかった（音声認識が あとから 合格にすることもあるので 少し待ってから知らせる）
        // 音声認識の けっかを はやく もらうため、ここで いったん とめる（パソコン：声の おわりは 周波数解析で わかる）
        // ながすぎ・ほかの音が あった ときも とめる（とめないと 音声認識の おわりを 2〜4びょう まつ ことに なる）
        if (this.target && runLen >= UTT_MIN_FRAMES && !this.paused) this.finalizeAsr()
        if (this.target && lenOk && !this.paused) {
          const t = this.target
          const n = this.passCount
          window.setTimeout(() => {
            if (this.target === t && this.passCount === n && !this.paused) this.onMiss?.()
          }, 1500)
        }
      }
    }
    this.streak = this.utt?.run ?? 0
    this.onFrame?.({ bands, voiced, match, streak: Math.min(this.streak, STREAK_TO_PASS) })
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

  /** 音声認識が さいごに きいた ことば（ひらがな）と その 時刻 */
  private recentAsr: { text: string; at: number } | null = null

  /** この 発声の あいだに、音声認識が 目標と ちがう 文字（みじかい かな）を きいていたか */
  private heardOtherText(target: Kana, uttStartAt: number) {
    const r = this.recentAsr
    return r && r.at >= uttStartAt - 200 && isShortKana(r.text) && !this.asrMatches(target, r.text) ? r.text : null
  }

  /** 音声認識の けっかが 目標の 文字か（ら・れ・ろ は「だ・で・ど」も） */
  private asrMatches(target: Kana, t: string) {
    return transcriptMatches(target, t) || flapMatches(target, t)
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

  /** 音声認識を いったん とめて、そこまでの けっかを すぐ もらう（とまったら onend で すぐ また はじめる） */
  private asrFinalizing = false
  /**
   * iPhone・iPad：フローラちゃんが しゃべる あいだは 音声認識（マイク）を とめる。
   * マイクを つかって いる あいだの iPhone・iPad の 音は 電話のような 音質に なり、声が かすれて きこえるため。
   * しゃべりはじめ：とめて、VOICE_MUTE_WAIT_MS まって もらう。しゃべりおわり：すぐ また はじめる
   */
  private unsubVoice: (() => void) | null = null
  private mutedForVoice = false
  private unmuteTimer = 0
  private floraVoice(speaking: boolean): number {
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
  }
  private asrDeaf() {
    window.clearTimeout(this.asrReadyTimer)
    this.asrHearing = false
  }

  /**
   * iPhone・iPad（Apple の 音声認識だけ）は、合格・フローラちゃんの 声の たびに マイク（音声認識）を とめて また はじめるので、
   * きこえない すきま（あてて から 約1.3びょう）が ある。シューティングは その あいだ カードを とめ、きこえる ように なったら
   * ねらう カードに わくを つけて「よんで いいよ」の 合図に する（canHear）
   */
  hasMicGaps() {
    return this.asrOnly && this.running
  }
  /** いま よめば きこえるか（パソコン・Android は いつも true） */
  canHear() {
    if (!this.asrOnly) return true
    const now = performance.now()
    // ロック（setTarget・hold）は みない：ロックは けっかが とどいた 時刻で みるので、わくが ひかって すぐ よんでも けっかは ロックの あと に とどく
    return this.running && !this.paused && this.asrHearing && !this.mutedForVoice && !this.asrFinalizing && now >= this.asrHearAt
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
        // ロック中に聞こえた分（フローラちゃんの声・前の問題の声）も のぞく
        this.asrSkip = Math.max(0, this.asrLastIdx)
        this.asrSkipText = this.asrLastText
        return
      }
      for (let i = Math.max(e.resultIndex, this.asrSkip); i < e.results.length; i++) {
        const alts = e.results[i]
        for (let j = 0; j < alts.length; j++) {
          const t = fresh(i, alts[j].transcript)
          if (this.target && t && this.asrMatches(this.target, t)) {
            this.pending = null
            this.pass('asr')
            return
          }
        }
      }
      // さいごに きこえた ことば（周波数解析の 判定で、ちがう 文字を きいていないか みる）
      if (latest?.[0]) {
        const t = toHiragana(fresh(last, latest[0].transcript).normalize('NFKC')).replace(/[\s、。．.,!！?？〜~ー「」]/g, '')
        if (t) this.recentAsr = { text: t, at: performance.now() }
        // とちゅうの けっかが 来て まだ 合格で なければ、すこし まって とめ、さいごの けっかを もらう
        if (t) {
          window.clearTimeout(this.debounceTimer)
          this.armDebounce(performance.now())
        }
        // 合格を まっているときに、ちがう 文字（「か」「あ」など）が きこえたら とりけす
        if (this.pending && isShortKana(t) && !this.asrMatches(this.pending.target, t)) {
          this.pending = null
          this.onMiss?.()
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
    // iPhone・iPad（音声認識だけ）は 周波数解析が ないので、音声認識の「声の おわり」の 知らせで とめる。
    // 知らせが 来ない ときの ために、声が はじまって ASR_FORCE_AFTER_SOUND_MS たっても 合格して いなければ とめる
    const onVoiceStart = () => {
      if (!this.asrOnly || !this.target) return
      window.clearTimeout(this.forceTimer)
      this.forceTimer = window.setTimeout(() => this.finalizeAsr(), ASR_FORCE_AFTER_SOUND_MS)
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
