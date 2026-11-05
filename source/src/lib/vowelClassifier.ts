/**
 * 母音の聞き分け（スペクトルの形から、あ・い・う・え・お の確率を出す）
 *
 * VOICEVOX の10の声と、その声を子どもの声に近づけたもの（声道を短く・声を高く）、
 * 声の大きさも変えた約8500の瞬間から学習した、かんたんな線形モデル（ロジスティック回帰）。
 * 見たことのない6つの声での試験：正しく読んだときの合格 約7割、ちがう母音での合格 約5%。
 */
import M from './vowelModel.json'
import type { Vowel } from '../data/kana'

export const VOWEL_ORDER: Vowel[] = ['あ', 'い', 'う', 'え', 'お']
const GRID: number[] = M.grid
const W: number[][] = M.W
const B: number[] = M.b
const MIN_DB = -100
const MAX_DB = 0

let tmp = new Float32Array(0)
let env = new Float32Array(0)

/** AnalyserNode の getByteFrequencyData の結果から、5つの母音の確率を返す */
export function vowelProbs(bytes: Uint8Array, binHz: number): number[] | null {
  const n = bytes.length
  if (env.length !== n) {
    env = new Float32Array(n)
    tmp = new Float32Array(n)
  }
  // 1) dB にもどし、倍音の山をつないだ「包絡」にする（最大値フィルタ 約330Hz → 平均 約190Hz）
  const half = Math.max(1, Math.round(164 / binHz))
  for (let i = 0; i < n; i++) {
    let m = 0
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) if (bytes[j] > m) m = bytes[j]
    tmp[i] = (m / 255) * (MAX_DB - MIN_DB) + MIN_DB
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
  // 2) 200〜6000Hz の40点で読み取り、形だけをくらべられるように正規化
  const f = GRID.map((hz) => {
    const x = hz / binHz
    const i = Math.floor(x)
    const t = x - i
    return env[Math.min(i, n - 1)] * (1 - t) + env[Math.min(i + 1, n - 1)] * t
  })
  const mean = f.reduce((a, b) => a + b, 0) / f.length
  let norm = 0
  for (let i = 0; i < f.length; i++) {
    f[i] -= mean
    norm += f[i] * f[i]
  }
  norm = Math.sqrt(norm)
  if (norm < 1e-6) return null
  for (let i = 0; i < f.length; i++) f[i] /= norm
  // 3) 母音ごとの点数 → 確率
  const z = W.map((w, k) => w.reduce((s, wi, i) => s + wi * f[i], B[k]))
  const mx = Math.max(...z)
  const e = z.map((v) => Math.exp(v - mx))
  const sum = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / sum)
}
