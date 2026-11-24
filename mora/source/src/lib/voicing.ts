/**
 * にごり（濁音）の 判定：子音の ところで 声帯が ふるえて いるか
 *
 * 「が」と「か」の ちがいは、子音の あと 声帯が ふるえはじめるまでの あいだ。
 *  - か：「カッ」と 強い 破裂の あと、声帯が ふるえない 息（シャー）が すこし つづいて から 母音
 *  - が：破裂は 弱く、すぐ（または 子音の まえから）声帯が ふるえる
 * そこで、母音の はじまりの まえを 2ms ごとに みて、つぎの 2つを はかる。
 *  ① prom：子音の 破裂・息の 高い音（2kHz いじょう）が、母音の 高い音より どれだけ 大きいか（dB）
 *  ② unv ：高い音（破裂・息・こすれ）が 出て いるのに 低い音が 周期的で ない（声帯が ふるえて いない）ながさ（ms）
 * どちらかが 大きければ「にごって いない（か・さ・た・は・ぱ）」。
 *
 * 2026-11-24：iPad で こえの 高い 女の子が「が」を 読んでも 合格しない。その子の「がぎぐげご」「かきくけこ」と
 * VOICEVOX 14人の 声（mora/tools/judge_test）で きめた。
 *  - こすれる 音（ざ・じ・ず・ぢ・づ、じゃ行）：「さ・し・ち・つ」は 声帯が ふるえない こすれが ながい（unv）。
 *    unv ≥ 60ms を にごらない と する（VOICEVOX：ざ行を 合格 95%・さ行を 不合格 62%、じゃ行 92%・しゃ行 73%）
 *  - 破裂する 音（が・だ・ば行、ぎゃ・びゃ行）：その子の 声では「か行」の 破裂が 強いか（prom ≥ -1dB）、
 *    いきが ながい（unv ≥ 30ms）ので 10こ とも 見わけられた。ただし VOICEVOX の 声では ほとんど 見わけられない
 *    （が行を 合格 52%・か行を 不合格 70%）。ほかの 子の 声で どれだけ あたるかは まだ わからない
 *  - 母音だけ（「あ」）と「が」は 見わけられない
 */

export interface VoicingInfo {
  /** 破裂・息の 高い音の 大きさ − 母音の 高い音（dB） */
  prom: number
  /** 声帯が ふるえて いない 息・こすれの ながさ（ms） */
  unv: number
  /** 母音（声）の はじまり（x の なかの サンプル位置） */
  voiceAt: number
}

/** にごって いない と みなす さかい（破裂する 音：か・た・ぱ・は） */
export const VOICELESS_PROM = -1
export const VOICELESS_UNV = 30
/** こすれる 音（さ・し・つ・ち）の さかい */
export const VOICELESS_UNV_FRIC = 60

const HOP_MS = 2
const WIN_MS = 5

/** 2次の IIR フィルタ（RBJ の biquad） */
function biquad(x: Float32Array, sr: number, f0: number, type: 'low' | 'high'): Float32Array {
  const w = (2 * Math.PI * f0) / sr
  const cos = Math.cos(w)
  const alpha = Math.sin(w) / (2 * Math.SQRT1_2)
  let b0: number, b1: number, b2: number
  if (type === 'low') {
    b0 = (1 - cos) / 2
    b1 = 1 - cos
    b2 = (1 - cos) / 2
  } else {
    b0 = (1 + cos) / 2
    b1 = -(1 + cos)
    b2 = (1 + cos) / 2
  }
  const a0 = 1 + alpha
  const a1 = -2 * cos
  const a2 = 1 - alpha
  const y = new Float32Array(x.length)
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
    x2 = x1
    x1 = x[i]
    y2 = y1
    y1 = v
    y[i] = v
  }
  return y
}

function filt(x: Float32Array, sr: number, f0: number, type: 'low' | 'high', order = 2) {
  let y = x
  for (let k = 0; k < order; k++) y = biquad(y, sr, f0, type)
  return y
}

function envDb(y: Float32Array, hop: number, win: number) {
  const n = Math.max(0, Math.floor((y.length - win) / hop))
  const out = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    for (let j = i * hop; j < i * hop + win; j++) s += y[j] * y[j]
    out[i] = 10 * Math.log10(s / win + 1e-14)
  }
  return out
}

/** 正規化 自己相関の 最大（110〜700Hz）。1 に ちかいほど 周期的（声帯が ふるえて いる） */
function periodicity(y: Float32Array, a: number, len: number, sr: number) {
  if (a < 0 || a + len > y.length) return 0
  let best = 0
  const l0 = Math.floor(sr / 700)
  const l1 = Math.ceil(sr / 110)
  for (let lag = l0; lag <= l1 && lag < len - 8; lag++) {
    let ab = 0, aa = 0, bb = 0
    for (let i = a; i < a + len - lag; i++) {
      const p = y[i]
      const q = y[i + lag]
      ab += p * q
      aa += p * p
      bb += q * q
    }
    const d = Math.sqrt(aa * bb)
    if (d > 0 && ab / d > best) best = ab / d
  }
  return best
}

function percentile(v: ArrayLike<number>, p: number) {
  const s = Array.from(v).sort((a, b) => a - b)
  return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0
}

function median(v: ArrayLike<number>) {
  return percentile(v, 0.5)
}

/**
 * x：声の はじまりの まえ（0.2びょう くらい）から 声の おわりまでの 音。
 * 声の はじまりが みつからなければ null
 */
export function voicingInfo(x: Float32Array, sr: number): VoicingInfo | null {
  const hop = Math.max(1, Math.round((sr * HOP_MS) / 1000))
  const win = Math.max(hop, Math.round((sr * WIN_MS) / 1000))
  // 低い音（声帯の ふるえ）は 900Hz より 下を 8kHz くらいに まびいて 周期を みる（計算を かるく する）
  const lo = filt(x, sr, 900, 'low')
  const step = Math.max(1, Math.round(sr / 8000))
  const sr8 = sr / step
  const lo8 = new Float32Array(Math.floor(lo.length / step))
  for (let i = 0; i < lo8.length; i++) lo8[i] = lo[i * step]
  const hi = filt(x, sr, 2000, 'high')
  const L = envDb(filt(lo, sr, 70, 'high', 1), hop, win)
  const H = envDb(hi, hop, win)
  const n = Math.min(L.length, H.length)
  if (n < 60) return null
  let pk = 0
  for (let i = 1; i < n; i++) if (L[i] > L[pk]) pk = i
  const perWin = Math.round(sr8 * 0.02)
  const perAt = (i: number) => periodicity(lo8, Math.round(((i * hop) / step)), perWin, sr8)
  // 母音（声）の はじまり：低い音が いちばん大きい ところから -15dB いないで、はっきり 周期的
  // （その まえの 音（まえに 読んだ 字・まわりの 声）は つかわない：いちばん大きい 声の まえで -30dB より しずかに なった ところから）
  let s0 = pk
  while (s0 > 0 && L[s0 - 1] >= L[pk] - 30) s0--
  let tv = -1
  for (let i = s0; i <= pk; i++) {
    if (L[i] >= L[pk] - 15 && perAt(i) >= 0.8) {
      tv = i
      break
    }
  }
  if (tv < 0 || tv + 40 > n) return null
  const hv = median(H.slice(tv + 10, tv + 40))
  const floor = percentile(H.slice(0, n), 0.1)
  let bmax = -Infinity
  for (let i = Math.max(0, tv - 25); i <= Math.min(n - 1, tv + 2); i++) bmax = Math.max(bmax, H[i])
  let unv = 0
  // 声帯が ふるえて いる：低い音が 母音から -25dB いないで 周期的（まわりの 低い うなりは 小さいので かぞえない）
  const voicedAt = (i: number) => L[i] >= L[pk] - 25 && perAt(i) >= 0.5
  for (let i = Math.max(0, tv - 40); i < tv; i++) if (H[i] >= Math.max(floor + 8, hv - 18) && !voicedAt(i)) unv += HOP_MS
  return { prom: bmax - hv, unv, voiceAt: tv * hop }
}

/** にごって いない 子音に きこえるか。fricative：こすれる 音（ざ・じ・ず・ぢ・づ・じゃ行）の カード */
export function soundsVoiceless(v: VoicingInfo, fricative = false) {
  if (fricative) return v.unv >= VOICELESS_UNV_FRIC
  return v.prom >= VOICELESS_PROM || v.unv >= VOICELESS_UNV
}

/** こすれる 音の 濁音（ざ行・じゃ行・ぢ・づ）か（ローマ字で きめる） */
export function isFricativeRomaji(r: string) {
  return /^(z|j|di|du)/.test(r)
}
