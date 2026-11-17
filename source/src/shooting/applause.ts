import { getAudioContext } from '../lib/audio'

/**
 * よめ丸くんたちの はくしゅ（パチパチパチ…）を WebAudio で つくる。
 * ノイズを みじかく くぎって、なんにんかが ばらばらに たたいている ように ならべる。
 */
export function playApplause(seconds = 3.2) {
  try {
    const c = getAudioContext()
    if (c.state === 'suspended') void c.resume()
    const len = Math.floor(c.sampleRate * 0.08)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4)

    const out = c.createGain()
    out.gain.value = 0.55
    out.connect(c.destination)
    const now = c.currentTime + 0.05
    const people = 7
    for (let p = 0; p < people; p++) {
      const rate = 4.2 + Math.random() * 2.2 // 1びょうに なんかい たたくか
      const freq = 900 + Math.random() * 1600
      let t = now + Math.random() * 0.25
      while (t < now + seconds) {
        const src = c.createBufferSource()
        src.buffer = buf
        src.playbackRate.value = 0.85 + Math.random() * 0.3
        const bp = c.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = freq * (0.9 + Math.random() * 0.2)
        bp.Q.value = 0.9
        const g = c.createGain()
        // おわりに むけて すこしずつ ちいさく
        const fade = Math.min(1, (now + seconds - t) / 0.8)
        g.gain.value = (0.35 + Math.random() * 0.4) * fade
        src.connect(bp).connect(g).connect(out)
        src.start(t)
        t += (1 / rate) * (0.8 + Math.random() * 0.4)
      }
    }
  } catch {
    /* noop */
  }
}
