/**
 * 子音の聞き分け（出だしの音から、どの なかまの 子音で はじまったかを しらべる）
 *
 * 母音の判定（vowelClassifier）は「あ・い・う・え・お」しか 見ないので、それだけだと
 * 「か」の 問題に「あ」と よんでも 合格してしまう。そこで、声（母音）が はじまる まえ 約0.1びょうと
 * はじまった ところの 音を こまかく（約5ミリびょうずつ）しらべ、子音の なかまを きめる。
 *
 *   V：母音だけ（あ行）  K：か・た行（はれつ）  S：さ・し・つ・ち（まさつ）  H：は・ひ・ふ
 *   N：な・ま行（はなの 音）  Y：や行  W：わ  R：ら行
 *
 * 合否には つかわない（voice.ts の looksBareVowel で、音声認識の けっかを まつか どうかを きめる だけ）
 *
 * 学習モデル（onsetModel.json）は VOICEVOX の 14の声（ふつう・こどもに ちかづけた 声、
 * まわりの 音を くわえたもの）から つくった（romaji/tools/judge_test/）。
 */
import M from './onsetModel.json'

export const ONSET_CLASSES = ['V', 'K', 'S', 'H', 'N', 'Y', 'W', 'R'] as const
export type OnsetClass = (typeof ONSET_CLASSES)[number]

/** 帯域（Hz） */
const BANDS: [number, number][] = [
  [100, 400],
  [400, 800],
  [800, 1500],
  [1500, 2500],
  [2500, 4000],
  [4000, 8000],
]
/** 母音の はじまり（0ms）から みた 窓（ms） */
const WINDOWS: [number, number][] = [
  [-120, -70],
  [-70, -40],
  [-40, -20],
  [-20, -5],
  [-5, 15],
  [15, 50],
]
const BLOCK_MS = 5

/* ---------- 小さな FFT（256点） ---------- */
const FN = 256
const fcos = new Float64Array(FN / 2)
const fsin = new Float64Array(FN / 2)
const hann = new Float64Array(FN)
for (let k = 0; k < FN / 2; k++) {
  fcos[k] = Math.cos((-2 * Math.PI * k) / FN)
  fsin[k] = Math.sin((-2 * Math.PI * k) / FN)
}
for (let i = 0; i < FN; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FN)
const re = new Float64Array(FN)
const im = new Float64Array(FN)
function power(x: Float32Array, at: number, len: number, out: Float64Array) {
  re.fill(0)
  im.fill(0)
  for (let i = 0; i < Math.min(len, FN); i++) re[i] = (x[at + i] ?? 0) * hann[i]
  for (let i = 1, j = 0; i < FN; i++) {
    let bit = FN >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const t = re[i]
      re[i] = re[j]
      re[j] = t
    }
  }
  for (let len2 = 2; len2 <= FN; len2 <<= 1) {
    const step = FN / len2
    const h = len2 / 2
    for (let i = 0; i < FN; i += len2)
      for (let k = 0; k < h; k++) {
        const wr = fcos[k * step]
        const wi = fsin[k * step]
        const a = i + k + h
        const tr = re[a] * wr - im[a] * wi
        const ti = re[a] * wi + im[a] * wr
        re[a] = re[i + k] - tr
        im[a] = im[i + k] - ti
        re[i + k] += tr
        im[i + k] += ti
      }
  }
  for (let k = 0; k < FN / 2; k++) out[k] = re[k] * re[k] + im[k] * im[k]
}

/**
 * 20ミリびょうの 窓で、声（周期的な 音）らしさ 0〜1。
 * stopAt：その あたいに とどいたら そこで やめる（「0.5 いじょうか」だけ しりたい ときに はやく おわる）
 */
function voicing(x: Float32Array, center: number, sr: number, stopAt = Infinity) {
  const half = Math.round(sr * 0.012)
  // 44.1kHz では ブロックの まんなかが はんぱな 位置（110.5 など）に なるので まるめる（まるめないと 計算が NaN に なり、子音が まったく わからなかった）
  const a = Math.max(0, Math.round(center) - half)
  const b = Math.min(x.length, Math.round(center) + half)
  const n = b - a
  if (n < half) return 0
  let mean = 0
  for (let i = a; i < b; i++) mean += x[i]
  mean /= n
  const p = new Float64Array(n)
  // cs[k]：p[0..k) の 2じょうの わ（ずらした ときの 大きさを すぐ だせる）
  const cs = new Float64Array(n + 1)
  for (let i = 0; i < n; i++) {
    p[i] = x[a + i] - mean
    cs[i + 1] = cs[i] + p[i] * p[i]
  }
  if (cs[n] <= 1e-12) return 0
  let best = 0
  const lo = Math.round(sr / 700)
  const hi = Math.round(sr / 75)
  for (let lag = lo; lag <= hi && lag < n - 8; lag += 2) {
    const m = n - lag
    let s = 0
    for (let i = 0; i < m; i++) s += p[i] * p[i + lag]
    const r = s / Math.sqrt(cs[m] * (cs[n] - cs[lag]) + 1e-12)
    if (r > best) {
      best = r
      if (best >= stopAt) return best
    }
  }
  return best
}

export interface OnsetInfo {
  feat: number[]
  /** 母音の はじまりの 位置（サンプル） */
  tv: number
}

/**
 * 発声の 音（まえに 0.15びょう いじょうの よゆう つき）から、出だしの 特徴を つくる。
 * 母音の はじまり：いちばん大きい ところから -12dB いないで、声（周期的）に なった ところ。
 */
export function onsetFeatures(x: Float32Array, sr: number): OnsetInfo | null {
  const B = Math.max(1, Math.round((sr * BLOCK_MS) / 1000))
  const nb = Math.floor(x.length / B)
  if (nb < 30) return null
  const binHz = sr / FN
  const P = new Float64Array(FN / 2)
  const E: number[] = []
  const bandDb: number[][] = []
  for (let i = 0; i < nb; i++) {
    const at = i * B + Math.floor(B / 2) - FN / 2
    power(x, Math.max(0, at), FN, P)
    const bands = BANDS.map(([lo, hi]) => {
      let s = 0
      for (let k = Math.max(1, Math.round(lo / binHz)); k <= Math.min(FN / 2 - 1, Math.round(hi / binHz)); k++) s += P[k]
      return 10 * Math.log10(s + 1e-12)
    })
    let s = 0
    for (let k = Math.round(100 / binHz); k <= Math.min(FN / 2 - 1, Math.round(8000 / binHz)); k++) s += P[k]
    E.push(10 * Math.log10(s + 1e-12))
    bandDb.push(bands)
  }
  const top = Math.max(...E)
  // 母音の はじまり
  let tv = -1
  for (let i = 0; i < nb; i++) {
    if (E[i] >= top - 12 && voicing(x, i * B + B / 2, sr, 0.5) >= 0.5) {
      tv = i
      break
    }
  }
  if (tv < 0) return null
  // 母音の 形（はじまりから 20〜80ms）
  const vb = BANDS.map((_, k) => {
    let s = 0
    let c = 0
    for (let i = tv + 4; i <= Math.min(nb - 1, tv + 16); i++) {
      s += bandDb[i][k]
      c++
    }
    return c ? s / c : bandDb[tv][k]
  })
  const feat: number[] = []
  for (const [w0, w1] of WINDOWS) {
    const a = tv + Math.round(w0 / BLOCK_MS)
    const b = tv + Math.round(w1 / BLOCK_MS)
    let e = 0
    let c = 0
    const bs = new Array(BANDS.length).fill(0)
    let vo = 0
    for (let i = a; i < b; i++) {
      const ii = Math.min(nb - 1, Math.max(0, i))
      e += Math.max(E[ii] - top, -50)
      for (let k = 0; k < BANDS.length; k++) bs[k] += Math.max(bandDb[ii][k] - vb[k], -50)
      c++
    }
    // 声らしさは 窓の まんなかで 1回だけ
    vo = voicing(x, Math.min(nb - 1, Math.max(0, Math.round((a + b) / 2))) * B, sr)
    feat.push(e / c / 50)
    for (let k = 0; k < BANDS.length; k++) feat.push(bs[k] / c / 50)
    // 帯域の かたむき（高い 帯域 − 低い 帯域）：まさつ・いきの 音は 高い ほうが つよい
    feat.push((bs[4] + bs[5] - bs[0] - bs[1]) / c / 100)
    feat.push(vo)
  }
  // 出だしの まとめ：声に なっていない 音（息・まさつ・はれつ）が 母音の まえに どれだけ あるか
  const sortedE = [...E].sort((p, q) => p - q)
  const bg = sortedE[Math.floor(sortedE.length * 0.2)]
  const floor = Math.max(bg + 8, top - 45)
  let uE = 0
  let uN = 0
  let vN = 0
  let first = tv
  for (let i = tv - 1; i >= Math.max(0, tv - Math.round(150 / BLOCK_MS)); i--) {
    if (E[i] < floor) continue
    first = i
    const vo = voicing(x, i * B + B / 2, sr, 0.45)
    if (vo < 0.45) {
      uE += Math.pow(10, (E[i] - top) / 10)
      uN++
    } else vN++
  }
  const att = (E[Math.min(nb - 1, tv + 2)] - E[Math.max(0, tv - 2)]) / 30
  // 母音の まえの 高い 音の わりあい（母音と くらべて）
  let hiPre = 0
  let c2 = 0
  for (let i = Math.max(0, tv - 16); i < tv; i++) {
    if (E[i] < floor) continue
    hiPre += bandDb[i][4] + bandDb[i][5] - bandDb[i][0] - bandDb[i][1] - (vb[4] + vb[5] - vb[0] - vb[1])
    c2++
  }
  // 2.5ミリびょうごとの 大きさの うごき：はれつ（か・た）は「いきなり 大きくなって、母音の まえで ひくい ところに とどまる」、
  // 母音だけは「なめらかに 大きくなる」。いちばん 大きい ところから -6dB に とどく 点から さかのぼって みる
  const B2 = Math.max(1, Math.round(sr * 0.0025))
  const n2 = Math.floor(x.length / B2)
  const e2: number[] = []
  for (let i = 0; i < n2; i++) {
    let q = 0
    for (let j = i * B2; j < (i + 1) * B2; j++) q += x[j] * x[j]
    e2.push(10 * Math.log10(q / B2 + 1e-12))
  }
  const top2 = Math.max(...e2)
  let t6 = e2.findIndex((v) => v >= top2 - 6)
  if (t6 < 0) t6 = 0
  for (const k of [2, 4, 6, 8, 12, 16, 20, 28, 36]) feat.push(Math.max(e2[Math.max(0, t6 - k)] - top2, -50) / 50)
  let jump = 0
  let jumpLv = -50
  for (let i = Math.max(2, t6 - 48); i <= t6; i++) {
    const d = e2[i] - e2[i - 2]
    if (d > jump) {
      jump = d
      jumpLv = Math.max(e2[i] - top2, -50)
    }
  }
  feat.push(jump / 30, jumpLv / 50)
  feat.push(Math.max(-5, Math.log10(uE + 1e-5)) / 5, (uN * BLOCK_MS) / 100, (vN * BLOCK_MS) / 100, ((tv - first) * BLOCK_MS) / 100, att, c2 ? hiPre / c2 / 100 : 0)
  return { feat, tv: tv * B }
}

interface Net {
  W1: number[][]
  b1: number[]
  W2: number[][]
  b2: number[]
}
const MODEL = M as unknown as { classes: string[]; mu: number[]; sd: number[]; thr: number[]; thrStrict: number[]; thrLoose: number[]; thrFast: number[]; nets: Net[] }

/** 子音の なかまの 確率（ONSET_CLASSES の じゅん）。小さな ニューラルネット 3つの 平均 */
export function onsetProbs(feat: number[]): number[] {
  const nets = MODEL.nets ?? []
  if (!nets.length || feat.length !== MODEL.mu.length) return ONSET_CLASSES.map(() => 1 / ONSET_CLASSES.length)
  const f = feat.map((v, i) => (v - MODEL.mu[i]) / MODEL.sd[i])
  const avg = new Array<number>(ONSET_CLASSES.length).fill(0)
  for (const n of nets) {
    const h = n.W1.map((w, j) => Math.max(0, w.reduce((s, wi, i) => s + wi * f[i], n.b1[j])))
    const z = n.W2.map((w, k) => w.reduce((s, wi, j) => s + wi * h[j], n.b2[k]))
    const mx = Math.max(...z)
    const e = z.map((v) => Math.exp(v - mx))
    const sum = e.reduce((a, b) => a + b, 0)
    e.forEach((v, k) => (avg[k] += v / sum / nets.length))
  }
  return avg
}

/**
 * 目標の なかまの スコア（子音：p[目標]/(p[目標]+p[母音だけ])、あ行：p[母音だけ]/(p[母音だけ]+いちばん つよい 子音)）と しきいち。
 * voice.ts の 判定で つかう：fast 以上なら すぐ 合格（パソコン・Android）、loose みまんの あ行は 子音っぽいので 合格に しない
 */
export function onsetScore(p: number[], want: OnsetClass) {
  const k = ONSET_CLASSES.indexOf(want)
  const s = k === 0 ? p[0] / (p[0] + Math.max(...p.slice(1)) + 1e-9) : p[k] / (p[k] + p[0] + 1e-9)
  // loose：正しい よみの 97% が こえる（これ みまんは「ちがう なかま っぽい」）
  // fast：子音の 文字は 母音だけの よみが 2%、あ行は 子音の よみが 3% しか こえない（これ いじょうは「はっきり 正しい」）
  // strict：あ行を 周波数解析だけで 合格に する とき（iPad で こえの とうろく）の 線。子音つきの よみ（ka など）を 約8わり おとす
  return { score: s, loose: MODEL.thrLoose?.[k] ?? 0, fast: MODEL.thrFast?.[k] ?? 2, strict: MODEL.thrStrict?.[k] ?? 0 }
}

/** 文字（ローマ字）の 子音の なかま。ん は しらべない（null） */
export function onsetClassOf(romaji: string): OnsetClass | null {
  if (romaji === 'n') return null
  if (/^[aiueo]$/.test(romaji)) return 'V'
  if (romaji === 'wo') return 'V' // を は お と おなじ よみ
  const c = romaji.replace(/[aiueo]$/, '')
  if (c === 'k' || c === 't') return 'K'
  if (c === 's' || c === 'sh' || c === 'ts' || c === 'ch') return 'S'
  if (c === 'h' || c === 'f') return 'H'
  if (c === 'n' || c === 'm') return 'N'
  if (c === 'y') return 'Y'
  if (c === 'w') return 'W'
  if (c === 'r') return 'R'
  return null
}
