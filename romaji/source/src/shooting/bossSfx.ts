import { getAudioContext, getOutput } from '../lib/audio'

/** ホワイトノイズ（なんども つかうので 1つ つくって おく） */
let noise: AudioBuffer | null = null
function noiseBuf(c: AudioContext) {
  if (!noise || noise.sampleRate !== c.sampleRate) {
    noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noise
}

function ctx() {
  const c = getAudioContext()
  if (c.state === 'suspended') void c.resume()
  return c
}

/** ドーン（ばくはつ） */
function boom(c: AudioContext, at: number, vol = 0.6, len = 0.6) {
  const out = getOutput()
  const n = c.createBufferSource()
  n.buffer = noiseBuf(c)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(3200, at)
  lp.frequency.exponentialRampToValueAtTime(120, at + len)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  n.connect(lp).connect(g).connect(out)
  n.start(at)
  n.stop(at + len + 0.05)
  // おなかに ひびく ひくい 音
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(150, at)
  o.frequency.exponentialRampToValueAtTime(38, at + len * 0.7)
  const og = c.createGain()
  og.gain.setValueAtTime(0.0001, at)
  og.gain.exponentialRampToValueAtTime(vol * 0.9, at + 0.01)
  og.gain.exponentialRampToValueAtTime(0.0001, at + len * 0.8)
  o.connect(og).connect(out)
  o.start(at)
  o.stop(at + len)
}

/**
 * フローラちゃん スーパービーム：ためる（キュイーン）→ ビーム（ズバババ）→ ばくはつ（ドーン）
 * じかんの ながれは BossBattle の アニメーションと あわせてある（0.25びょうで はっしゃ、0.35びょうで めいちゅう）
 */
export function playSuperBeam() {
  try {
    const c = ctx()
    const out = getOutput()
    const t0 = c.currentTime + 0.02

    // ためる：たかく なっていく 音
    const ch = c.createOscillator()
    ch.type = 'triangle'
    ch.frequency.setValueAtTime(260, t0)
    ch.frequency.exponentialRampToValueAtTime(1400, t0 + 0.26)
    const chg = c.createGain()
    chg.gain.setValueAtTime(0.0001, t0)
    chg.gain.exponentialRampToValueAtTime(0.16, t0 + 0.2)
    chg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3)
    ch.connect(chg).connect(out)
    ch.start(t0)
    ch.stop(t0 + 0.32)

    // ビーム：ふとい のこぎり波 2つ ＋ ザーッ という ノイズ。フィルターを ふるわせて ズバババ
    const b0 = t0 + 0.25
    const b1 = b0 + 0.62
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1600
    lp.Q.value = 6
    const lfo = c.createOscillator()
    lfo.frequency.value = 22
    const lfoG = c.createGain()
    lfoG.gain.value = 900
    lfo.connect(lfoG).connect(lp.frequency)
    const bg = c.createGain()
    bg.gain.setValueAtTime(0.0001, b0)
    bg.gain.exponentialRampToValueAtTime(0.24, b0 + 0.03)
    bg.gain.setValueAtTime(0.2, b1 - 0.2)
    bg.gain.exponentialRampToValueAtTime(0.0001, b1)
    lp.connect(bg).connect(out)
    for (const [f, type] of [
      [82, 'sawtooth'],
      [164.8, 'sawtooth'],
      [329, 'square'],
    ] as const) {
      const o = c.createOscillator()
      o.type = type
      o.frequency.setValueAtTime(f * 1.4, b0)
      o.frequency.exponentialRampToValueAtTime(f, b0 + 0.12)
      o.connect(lp)
      o.start(b0)
      o.stop(b1 + 0.05)
    }
    lfo.start(b0)
    lfo.stop(b1 + 0.05)
    const n = c.createBufferSource()
    n.buffer = noiseBuf(c)
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2600
    bp.Q.value = 0.8
    const ng = c.createGain()
    ng.gain.setValueAtTime(0.0001, b0)
    ng.gain.exponentialRampToValueAtTime(0.14, b0 + 0.03)
    ng.gain.exponentialRampToValueAtTime(0.0001, b1)
    n.connect(bp).connect(ng).connect(out)
    n.start(b0)
    n.stop(b1 + 0.05)

    // めいちゅう：カードで ドーン、じゃままるくんに ドン
    boom(c, t0 + 0.35, 0.55, 0.55)
    boom(c, t0 + 0.47, 0.35, 0.4)
  } catch {
    /* noop */
  }
}

/** じゃままるくんが やられる：ひゅるるる〜 → ポンッ → きらきら */
export function playDefeat() {
  try {
    const c = ctx()
    const out = getOutput()
    const t0 = c.currentTime + 0.05
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(1300, t0)
    o.frequency.exponentialRampToValueAtTime(220, t0 + 1.3)
    const vib = c.createOscillator()
    vib.frequency.value = 9
    const vg = c.createGain()
    vg.gain.value = 40
    vib.connect(vg).connect(o.frequency)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.05)
    g.gain.setValueAtTime(0.16, t0 + 1.15)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.35)
    o.connect(g).connect(out)
    o.start(t0)
    o.stop(t0 + 1.4)
    vib.start(t0)
    vib.stop(t0 + 1.4)
    // ポンッ
    const p = c.createOscillator()
    p.type = 'sine'
    p.frequency.setValueAtTime(600, t0 + 1.35)
    p.frequency.exponentialRampToValueAtTime(1500, t0 + 1.42)
    const pg = c.createGain()
    pg.gain.setValueAtTime(0.0001, t0 + 1.35)
    pg.gain.exponentialRampToValueAtTime(0.3, t0 + 1.37)
    pg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.55)
    p.connect(pg).connect(out)
    p.start(t0 + 1.35)
    p.stop(t0 + 1.6)
    // きらきら
    ;[2093, 2637, 3136, 4186].forEach((f, i) => {
      const s = c.createOscillator()
      s.type = 'sine'
      s.frequency.value = f
      const sg = c.createGain()
      const at = t0 + 1.5 + i * 0.07
      sg.gain.setValueAtTime(0.0001, at)
      sg.gain.exponentialRampToValueAtTime(0.08, at + 0.01)
      sg.gain.exponentialRampToValueAtTime(0.0001, at + 0.5)
      s.connect(sg).connect(out)
      s.start(at)
      s.stop(at + 0.55)
    })
  } catch {
    /* noop */
  }
}
