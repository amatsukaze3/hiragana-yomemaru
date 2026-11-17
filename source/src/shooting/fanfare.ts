import { getAudioContext, getOutput } from '../lib/audio'

/**
 * おいわいの ファンファーレ（タタタ・ターン♪）と、きらきらの 音。
 * ラッパに ちかい 音（のこぎり波を やわらかく した もの）で 和音を ならし、さいごに 鈴の 音を ちらす。
 */
export function playFanfare() {
  try {
    const c = getAudioContext()
    if (c.state === 'suspended') void c.resume()
    const t0 = c.currentTime + 0.05

    const master = c.createGain()
    master.gain.value = 0.5
    // すこし ひびきを つける（みじかい ディレイ）
    const delay = c.createDelay()
    delay.delayTime.value = 0.11
    const fb = c.createGain()
    fb.gain.value = 0.22
    delay.connect(fb).connect(delay)
    master.connect(getOutput())
    master.connect(delay)
    delay.connect(getOutput())

    // ラッパの 音：のこぎり波 2つを すこし ずらして、ローパスで まるく。たちあがりは すこし ゆっくり
    const brass = (freq: number, start: number, dur: number, vol = 0.16) => {
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.Q.value = 1.2
      lp.frequency.setValueAtTime(freq * 1.5, start)
      lp.frequency.linearRampToValueAtTime(freq * 5, start + 0.06)
      lp.frequency.linearRampToValueAtTime(freq * 3, start + dur)
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, start)
      g.gain.linearRampToValueAtTime(vol, start + 0.035)
      g.gain.setValueAtTime(vol * 0.85, start + Math.max(0.05, dur - 0.08))
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur + 0.12)
      for (const det of [-6, 6]) {
        const o = c.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = freq
        o.detune.value = det
        // ちいさな ビブラート
        const lfo = c.createOscillator()
        const lg = c.createGain()
        lfo.frequency.value = 5.5
        lg.gain.value = dur > 0.4 ? 6 : 0
        lfo.connect(lg).connect(o.detune)
        o.connect(lp)
        o.start(start)
        o.stop(start + dur + 0.15)
        lfo.start(start)
        lfo.stop(start + dur + 0.15)
      }
      lp.connect(g).connect(master)
    }

    // 鈴の 音（サイン波 ＋ 高い 倍音、すぐ きえる）
    const bell = (freq: number, start: number, vol = 0.07) => {
      for (const [mul, v] of [
        [1, 1],
        [2.76, 0.35],
        [5.4, 0.15],
      ] as const) {
        const o = c.createOscillator()
        o.type = 'sine'
        o.frequency.value = freq * mul
        const g = c.createGain()
        g.gain.setValueAtTime(0.0001, start)
        g.gain.exponentialRampToValueAtTime(vol * v, start + 0.008)
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.9 / mul + 0.3)
        o.connect(g).connect(master)
        o.start(start)
        o.stop(start + 1.3)
      }
    }

    const N = (semi: number) => 523.25 * Math.pow(2, semi / 12) // C5 から
    // タ・タ・タ・ターーン（ド ド ド ソ〜 ミ ソ ド〜）
    const melody: [number, number, number][] = [
      [0, 0, 0.12],
      [0, 0.15, 0.12],
      [0, 0.3, 0.12],
      [7, 0.45, 0.42],
      [4, 0.92, 0.16],
      [7, 1.1, 0.16],
      [12, 1.28, 1.1],
    ]
    for (const [s, at, d] of melody) brass(N(s), t0 + at, d)
    // さいごの 和音（ド・ミ・ソ を したに かさねる）
    for (const s of [-12, -8, -5]) brass(N(s), t0 + 1.28, 1.1, 0.1)
    // きらきら
    const sparkle = [24, 28, 31, 36, 31, 36, 40]
    sparkle.forEach((s, i) => bell(N(s), t0 + 1.3 + i * 0.075 + Math.random() * 0.02))
  } catch {
    /* noop */
  }
}
