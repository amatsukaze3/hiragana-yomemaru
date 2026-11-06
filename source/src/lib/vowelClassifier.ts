/**
 * 母音の聞き分け（スペクトルの形から、あ・い・う・え・お の確率を出す）
 *
 * 1) こえの とうろく がある：その子の「あいうえお」の形とくらべる（いちばん正確）
 * 2) ないとき：VOICEVOX の10の声と、子どもの声に近づけた声から学習した線形モデルを使う
 */
import M from './vowelModel.json'
import type { Vowel } from '../data/kana'

export const VOWEL_ORDER: Vowel[] = ['あ', 'い', 'う', 'え', 'お']
const GRID: number[] = M.grid
const W: number[][] = M.W
const B: number[] = M.b
const MIN_DB = -130
const MAX_DB = 0

let tmp = new Float32Array(0)
let env = new Float32Array(0)

/** AnalyserNode の getByteFrequencyData の結果から、スペクトルの形（40点・正規化ずみ）を返す */
export function vowelFeature(bytes: Uint8Array, binHz: number, noise?: Float32Array | null): number[] | null {
  const n = bytes.length
  if (env.length !== n) {
    env = new Float32Array(n)
    tmp = new Float32Array(n)
  }
  // 倍音の山をつないだ「包絡」にする（最大値フィルタ 約330Hz → 平均 約190Hz）
  const half = Math.max(1, Math.round(164 / binHz))
  let peak = 0
  for (let i = 0; i < n; i++) if (bytes[i] > peak) peak = bytes[i]
  // 声の大きさによらず同じ形になるよう、いちばん強いところから 60dB 下を底にする
  const floorDb = (peak / 255) * (MAX_DB - MIN_DB) + MIN_DB - 60
  for (let i = 0; i < n; i++) {
    let m = 0
    let mj = i
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) if (bytes[j] > m) ((m = bytes[j]), (mj = j))
    let db = (m / 255) * (MAX_DB - MIN_DB) + MIN_DB
    // まわりの音（教室のざわざわ）の分を 差し引く
    if (noise && noise.length === n) {
      const pw = Math.pow(10, db / 10)
      db = 10 * Math.log10(Math.max(pw - noise[mj], pw * 0.03))
    }
    tmp[i] = Math.max(floorDb, db)
  }
  const sm = Math.max(1, Math.round(94 / binHz))
  for (let i = 0; i < n; i++) {
    let s = 0
    let c = 0
    for (let j = Math.max(0, i - sm); j <= Math.min(n - 1, i + sm); j++) {
      s += tmp[j]
      c++
    }
    env[i] = s / c
  }
  // 200〜6000Hz の40点で読み取り、形だけをくらべられるように正規化
  const f = GRID.map((hz) => {
    const x = hz / binHz
    const i = Math.floor(x)
    const t = x - i
    return env[Math.min(i, n - 1)] * (1 - t) + env[Math.min(i + 1, n - 1)] * t
  })
  return normalize(f)
}

function normalize(f: number[]): number[] | null {
  const mean = f.reduce((a, b) => a + b, 0) / f.length
  const g = f.map((v) => v - mean)
  const n = Math.sqrt(g.reduce((a, b) => a + b * b, 0))
  return n > 1e-6 ? g.map((v) => v / n) : null
}

function softmax(z: number[]) {
  const mx = Math.max(...z)
  const e = z.map((v) => Math.exp(v - mx))
  const sum = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / sum)
}

/** まわりの音のスペクトル（パワー）を ゆっくり平均する */
export function updateNoise(noise: Float32Array, bytes: Uint8Array, rate = 0.05) {
  for (let i = 0; i < bytes.length; i++) {
    const pw = Math.pow(10, ((bytes[i] / 255) * (MAX_DB - MIN_DB) + MIN_DB) / 10)
    noise[i] = noise[i] === 0 ? pw : noise[i] * (1 - rate) + pw * rate
  }
}

/** 学習モデルでの 5つの母音の確率 */
export function modelProbs(f: number[]): number[] {
  return softmax(W.map((w, k) => w.reduce((s, wi, i) => s + wi * f[i], B[k])))
}

/** 登録した その子の「あいうえお」とくらべた 5つの母音の確率（形の近さを温度 0.04 で確率に） */
export function personalProbs(f: number[], C: number[][]): number[] {
  return softmax(C.map((c) => c.reduce((s, ci, i) => s + ci * f[i], 0) / 0.04))
}

/** 声の登録用：1つの発声の母音部分（後ろの2/3）の平均の形 */
export function meanShape(feats: number[][]): number[] | null {
  const tail = feats.slice(Math.floor(feats.length * 0.34))
  if (tail.length < 3) return null
  const m = new Array(tail[0].length).fill(0)
  for (const f of tail) for (let i = 0; i < m.length; i++) m[i] += f[i] / tail.length
  return normalize(m)
}
