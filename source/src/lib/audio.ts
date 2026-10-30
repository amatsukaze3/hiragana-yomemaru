/**
 * 音まわり：AudioContext の共有、iOS/Safari のアンロック、
 * ネイティブ音声読み上げ（speechSynthesis）、ピンポン♫チャイム。
 */

import vA from '../assets/voice/a.mp3'
import vI from '../assets/voice/i.mp3'
import vU from '../assets/voice/u.mp3'
import vE from '../assets/voice/e.mp3'
import vO from '../assets/voice/o.mp3'
import vPass5 from '../assets/voice/pass5.mp3'
import vClear10 from '../assets/voice/clear10.mp3'

/** ずんだもんの声（VOICEVOX:ずんだもん で作成した音声ファイル） */
const CLIPS: Record<string, string> = {
  あ: vA, い: vI, う: vU, え: vE, お: vO,
  pass5: vPass5, clear10: vClear10,
}
export type ClipName = 'pass5' | 'clear10'

let ctx: AudioContext | null = null
let unlocked = false
let jaVoice: SpeechSynthesisVoice | null = null

export function getAudioContext(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
  }
  return ctx
}

function pickVoice() {
  if (!('speechSynthesis' in window)) return
  const voices = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('ja'))
  const prefer = ['Kyoko', 'O-ren', 'Google 日本語', 'Nanami', 'Haruka', 'Ayumi', 'Otoya']
  jaVoice =
    prefer.map((p) => voices.find((v) => v.name.includes(p))).find(Boolean) ?? voices[0] ?? null
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice()
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice)
}

/** 最初のタップで呼ぶ。AudioContext と speechSynthesis の自動再生ブロックを解除する */
export function unlockAudio() {
  if (unlocked) return
  unlocked = true
  setPlaybackSession()
  try {
    const c = getAudioContext()
    if (c.state === 'suspended') void c.resume()
    // 無音を 1 サンプル鳴らして iOS のオーディオ経路を開く
    const buf = c.createBuffer(1, 1, 22050)
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    src.start(0)
  } catch {
    /* noop */
  }
  void preloadVoices()
  try {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      u.lang = 'ja-JP'
      speechSynthesis.speak(u)
    }
  } catch {
    /* noop */
  }
}

export function installUnlockListener() {
  const handler = () => {
    unlockAudio()
    window.removeEventListener('pointerdown', handler, true)
    window.removeEventListener('touchend', handler, true)
    window.removeEventListener('keydown', handler, true)
  }
  window.addEventListener('pointerdown', handler, true)
  window.addEventListener('touchend', handler, true)
  window.addEventListener('keydown', handler, true)
}

/** iPad/iPhone：消音スイッチがオンでも声が出るようにする（Safari 16.4+） */
let micActive = false

/**
 * iPhone/iPad（Safari・Chrome とも中身は WebKit）の音の使い方を切りかえる。
 * 'playback' は消音スイッチがオンでも鳴るが、マイクが止まってしまうので、
 * マイクを使っている間は 'play-and-record' にする。
 */
export function setMicActive(on: boolean) {
  micActive = on
  try {
    const nav = navigator as unknown as { audioSession?: { type: string } }
    if (nav.audioSession) nav.audioSession.type = on ? 'play-and-record' : 'playback'
  } catch {
    /* noop */
  }
}

function setPlaybackSession() {
  if (micActive) return
  try {
    const nav = navigator as unknown as { audioSession?: { type: string } }
    if (nav.audioSession) nav.audioSession.type = 'playback'
  } catch {
    /* noop */
  }
}

const buffers = new Map<string, AudioBuffer>()
const loading = new Map<string, Promise<AudioBuffer | null>>()
let current: AudioBufferSourceNode | null = null
let currentEl: HTMLAudioElement | null = null

function decode(c: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  // 古い Safari はコールバック形式しか使えない
  return new Promise((resolve, reject) => {
    const p = c.decodeAudioData(data, resolve, reject)
    if (p && typeof p.then === 'function') p.then(resolve, reject)
  })
}

/** data: URL は fetch を使わずに読む（公開ページの制限で fetch が止められても鳴るように） */
function readBytes(url: string): Promise<ArrayBuffer> {
  if (url.startsWith('data:')) {
    try {
      const b64 = url.slice(url.indexOf(',') + 1)
      const bin = atob(b64)
      const out = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
      return Promise.resolve(out.buffer)
    } catch (e) {
      return Promise.reject(e)
    }
  }
  return fetch(url).then((r) => r.arrayBuffer())
}

function loadClip(key: string): Promise<AudioBuffer | null> {
  const hit = buffers.get(key)
  if (hit) return Promise.resolve(hit)
  const pending = loading.get(key)
  if (pending) return pending
  const url = CLIPS[key]
  if (!url) return Promise.resolve(null)
  const p = readBytes(url)
    .then((d) => decode(getAudioContext(), d))
    .then((buf) => {
      buffers.set(key, buf)
      return buf
    })
    .catch(() => null)
  loading.set(key, p)
  return p
}

export function preloadVoices() {
  return Promise.all(Object.keys(CLIPS).map(loadClip))
}

function stopCurrent() {
  try {
    current?.stop()
  } catch {
    /* noop */
  }
  current = null
  if (currentEl) {
    currentEl.pause()
    currentEl = null
  }
}

/** 音声ファイルを鳴らす。Web Audio → <audio> → 端末の音声合成 の順に試す */
async function playClip(key: string, onEnd?: () => void, fallbackText?: string) {
  stopCurrent()
  setPlaybackSession()
  const c = getAudioContext()
  if (c.state !== 'running') await c.resume().catch(() => {})
  const buf = await loadClip(key)
  if (buf && c.state === 'running') {
    const src = c.createBufferSource()
    const gain = c.createGain()
    gain.gain.value = 1
    src.buffer = buf
    src.connect(gain).connect(c.destination)
    src.onended = () => {
      if (current === src) current = null
      onEnd?.()
    }
    current = src
    src.start()
    return
  }
  const url = CLIPS[key]
  if (url) {
    try {
      const el = new Audio(url)
      currentEl = el
      el.onended = () => onEnd?.()
      await el.play()
      return
    } catch {
      /* 次へ */
    }
  }
  if (fallbackText) speakSynth(fallbackText, onEnd)
  else onEnd?.()
}

/** ひらがなを読み上げる（ずんだもんの声） */
export function speak(text: string, opts: { onEnd?: () => void } = {}) {
  if (CLIPS[text]) void playClip(text, opts.onEnd, text)
  else speakSynth(text, opts.onEnd)
}

/** ほめことば（ずんだもん） */
export function sayVoice(name: ClipName) {
  void playClip(name)
}

/** 予備：端末の音声合成 */
function speakSynth(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) {
    onEnd?.()
    return
  }
  try {
    speechSynthesis.cancel()
    if (!jaVoice) pickVoice()
    window.setTimeout(() => {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'ja-JP'
      if (jaVoice) u.voice = jaVoice
      u.rate = 0.8
      u.pitch = 1.1
      if (onEnd) {
        u.onend = () => onEnd()
        u.onerror = () => onEnd()
      }
      speechSynthesis.speak(u)
    }, 60)
  } catch {
    onEnd?.()
  }
}

/** ピンポン♫ */
export function playChime() {
  try {
    const c = getAudioContext()
    if (c.state === 'suspended') void c.resume()
    const now = c.currentTime
    const tones: [number, number][] = [
      [1318.5, 0], // E6 ピン
      [1046.5, 0.18], // C6 ポン
    ]
    for (const [freq, t] of tones) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + t)
      gain.gain.exponentialRampToValueAtTime(0.35, now + t + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.6)
      osc.connect(gain).connect(c.destination)
      osc.start(now + t)
      osc.stop(now + t + 0.65)
    }
  } catch {
    /* noop */
  }
}

/** なぞりの一画ごとの小さな「ポッ」 */
export function playTick() {
  try {
    const c = getAudioContext()
    const now = c.currentTime
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(660, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15)
    osc.connect(gain).connect(c.destination)
    osc.start(now)
    osc.stop(now + 0.16)
  } catch {
    /* noop */
  }
}
