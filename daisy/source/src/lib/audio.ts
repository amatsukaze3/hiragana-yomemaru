/**
 * 音まわり：AudioContext の共有、iOS/Safari のアンロック、
 * ネイティブ音声読み上げ（speechSynthesis）、ピンポン♫チャイム。
 */

import { KANA_INFO } from '../data/kana'

/** デイジーちゃんの声（VOICEVOX:四国めたん で作成した音声ファイル。tools/voice/make_voices.py） */
const FILES = import.meta.glob('../assets/voice/*.mp3', { eager: true, import: 'default' }) as Record<string, string>
const byName: Record<string, string> = {}
for (const [path, url] of Object.entries(FILES)) byName[path.split('/').pop()!.replace('.mp3', '')] = url
const CLIPS: Record<string, string> = {}
for (const n of Object.keys(byName)) if (n.startsWith('assess_') || ['pass5', 'clear10', 'reg_guide', 'retry_register'].includes(n)) CLIPS[n] = byName[n]
for (const info of Object.values(KANA_INFO)) if (byName[info.romaji]) CLIPS[info.char] = byName[info.romaji]
export type ClipName = 'pass5' | 'clear10' | 'reg_guide' | 'retry_register' | 'assess_name' | 'assess_start' | 'assess_r1' | 'assess_r2' | 'assess_r3' | 'assess_r4'

let ctx: AudioContext | null = null
let unlocked = false
let jaVoice: SpeechSynthesisVoice | null = null

export function getAudioContext(): AudioContext {
  if (ctx && ctx.state === 'closed') ctx = null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
  }
  return ctx
}

let limiter: DynamicsCompressorNode | null = null
let sfxBus: GainNode | null = null

/**
 * すべての音の 出口。音が かさなっても 音われ（クリップ）しないよう、
 * スピーカーの てまえに リミッター（つよい コンプレッサー）を はさむ。
 */
function getMaster(): AudioNode {
  const c = getAudioContext()
  if (!limiter || limiter.context !== c) {
    limiter = c.createDynamicsCompressor()
    limiter.threshold.value = -4
    limiter.knee.value = 4
    limiter.ratio.value = 20
    limiter.attack.value = 0.002
    limiter.release.value = 0.12
    limiter.connect(c.destination)
  }
  return limiter
}

/**
 * 効果音（チャイム・ビーム・ファンファーレ など）の 出口。
 * デイジーちゃんが しゃべって いる あいだは 小さく する（ビームの「ボン」が 声に かさなると かすれて きこえるため）
 */
export function getOutput(): AudioNode {
  const c = getAudioContext()
  const master = getMaster()
  if (!sfxBus || sfxBus.context !== c) {
    sfxBus = c.createGain()
    sfxBus.gain.value = speaking > 0 ? SFX_DUCK : 1
    sfxBus.connect(master)
  }
  return sfxBus
}

/** デイジーちゃんが しゃべって いる あいだの 効果音の 大きさ */
const SFX_DUCK = 0.2
function duckSfx(on: boolean) {
  if (!sfxBus) return
  try {
    const t = sfxBus.context.currentTime
    sfxBus.gain.cancelScheduledValues(t)
    sfxBus.gain.setTargetAtTime(on ? SFX_DUCK : 1, t, on ? 0.015 : 0.12)
  } catch {
    /* noop */
  }
}

/**
 * デイジーちゃんが しゃべりはじめる・おわる ときの 知らせ（音声判定が マイクを とめる ために つかう）。
 * しゃべりはじめの 知らせは「声を だす まえに まって ほしい ミリびょう」を かえせる
 */
type VoiceListener = (speaking: boolean) => number | void
const voiceListeners = new Set<VoiceListener>()
export function onFloraVoice(fn: VoiceListener) {
  voiceListeners.add(fn)
  return () => {
    voiceListeners.delete(fn)
  }
}
let speaking = 0
function voiceBegin(): number {
  speaking++
  duckSfx(true)
  let wait = 0
  for (const f of voiceListeners) wait = Math.max(wait, Number(f(true) || 0))
  return wait
}
function voiceEnd() {
  speaking = Math.max(0, speaking - 1)
  if (speaking > 0) return
  duckSfx(false)
  for (const f of voiceListeners) f(false)
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
  // 1かいめの タップで アンロック。そのあとも タップの たびに、音の 出口が 止まっていたら 立てなおす
  // （iPad/iPhone は マイクの あとや、ほかの 音が わりこんだ あとに 止まったままに なることが あるため）
  const handler = () => {
    if (!unlocked) unlockAudio()
    else reviveAudio()
  }
  window.addEventListener('pointerdown', handler, true)
  window.addEventListener('touchend', handler, true)
  window.addEventListener('keydown', handler, true)
}

/** 音の 出口が 止まっていたら 立てなおす（タップの 中で よぶ） */
function reviveAudio() {
  try {
    const c = getAudioContext()
    if (c.state === 'running') return
    setPlaybackSession()
    c.resume().then(
      () => {
        if (c.state !== 'running') resetContext()
      },
      () => resetContext(),
    )
    // 無音を 1 サンプル鳴らして iOS のオーディオ経路を開きなおす
    const src = c.createBufferSource()
    src.buffer = c.createBuffer(1, 1, 22050)
    src.connect(c.destination)
    src.start(0)
  } catch {
    resetContext()
  }
}

/** 音の 出口を 作りなおす（マイクを つかっている あいだは しない：マイクの 判定が 止まるため） */
function resetContext() {
  if (micActive || !ctx) return
  try {
    void ctx.close()
  } catch {
    /* noop */
  }
  ctx = null
  limiter = null
  sfxBus = null
  try {
    const c = getAudioContext()
    if (c.state === 'suspended') void c.resume()
  } catch {
    /* noop */
  }
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
/** いま なっている 声の「おわり」（とちゅうで とめた ときも よぶ） */
let finishCurrent: (() => void) | null = null
let clipGen = 0

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
  const f = finishCurrent
  finishCurrent = null
  f?.()
}

/** 音声ファイルを鳴らす。Web Audio → <audio> → 端末の音声合成 の順に試す */
async function playClip(key: string, onEnd0?: () => void, fallbackText?: string) {
  stopCurrent()
  setPlaybackSession()
  const gen = ++clipGen
  let finished = false
  const fin = () => {
    if (finished) return
    finished = true
    if (finishCurrent === fin) finishCurrent = null
    voiceEnd()
  }
  const onEnd = () => {
    fin()
    onEnd0?.()
  }
  finishCurrent = fin
  window.setTimeout(fin, 20000) // 「おわり」が こない ときの ため
  // iPhone・iPad：マイクを とめて から しゃべる（マイクを つかって いる あいだは 電話のような 音質に なり かすれる）
  const wait = voiceBegin()
  if (wait > 0) await new Promise((r) => window.setTimeout(r, wait))
  if (gen !== clipGen) {
    // まって いる あいだに つぎの 声が はじまった
    onEnd()
    return
  }
  const c = getAudioContext()
  if (c.state !== 'running') await c.resume().catch(() => {})
  const buf = await loadClip(key)
  if (gen !== clipGen) {
    onEnd()
    return
  }
  if (buf && c.state === 'running') {
    const src = c.createBufferSource()
    const gain = c.createGain()
    gain.gain.value = 1
    src.buffer = buf
    src.connect(gain).connect(getMaster())
    src.onended = () => {
      if (current === src) current = null
      onEnd()
    }
    current = src
    src.start()
    // 見はり：鳴らしたのに 音の 時計が すすまないときは（iPad で 出口が 止まっている）、
    // <audio> で 鳴らしなおし、つぎからは 出口を 作りなおす
    const t0 = c.currentTime
    window.setTimeout(() => {
      if (current !== src || c.currentTime > t0 + 0.05) return
      try {
        src.onended = null
        src.stop()
      } catch {
        /* noop */
      }
      current = null
      resetContext()
      void playElement(key, onEnd, fallbackText)
    }, 450)
    return
  }
  await playElement(key, onEnd, fallbackText)
}

/** <audio> で 鳴らす → だめなら 端末の 音声合成 */
async function playElement(key: string, onEnd?: () => void, fallbackText?: string) {
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

/** 別のアプリ（デイジーちゃんシューティングなど）の音声ファイルを追加する */
export function registerClips(map: Record<string, string>) {
  Object.assign(CLIPS, map)
}

export function hasClip(key: string) {
  return !!CLIPS[key]
}

/** 登録した音声ファイルを鳴らす（端末の音声合成には切り替えない） */
export function playVoice(key: string, onEnd?: () => void) {
  void playClip(key, onEnd)
}

/** ひらがなを読み上げる（デイジーちゃんの声） */
export function speak(text: string, opts: { onEnd?: () => void } = {}) {
  if (CLIPS[text]) void playClip(text, opts.onEnd, text)
  else speakSynth(text, opts.onEnd)
}

/** ほめことば（デイジーちゃん） */
export function sayVoice(name: ClipName, onEnd?: () => void) {
  void playClip(name, onEnd)
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
      osc.connect(gain).connect(getOutput())
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
    osc.connect(gain).connect(getOutput())
    osc.start(now)
    osc.stop(now + 0.16)
  } catch {
    /* noop */
  }
}

/** シューティング：ビームの「ピュン！」と 爆発の「ボン」 */
export function playBeam() {
  try {
    const c = getAudioContext()
    if (c.state === 'suspended') void c.resume()
    const now = c.currentTime
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(1800, now)
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.18)
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)
    osc.connect(g).connect(getOutput())
    osc.start(now)
    osc.stop(now + 0.22)
    // ボン（ノイズ）
    const len = Math.floor(c.sampleRate * 0.35)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2)
    const src = c.createBufferSource()
    src.buffer = buf
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1200
    const g2 = c.createGain()
    g2.gain.value = 0.35
    src.connect(lp).connect(g2).connect(getOutput())
    src.start(now + 0.16)
  } catch {
    /* noop */
  }
}

/** シューティング：いん石が 下まで 落ちたときの「ブブー」 */
export function playMiss() {
  try {
    const c = getAudioContext()
    const now = c.currentTime
    for (const t of [0, 0.2]) {
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = 'sawtooth'
      osc.frequency.value = 160
      g.gain.setValueAtTime(0.0001, now + t)
      g.gain.exponentialRampToValueAtTime(0.1, now + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.17)
      osc.connect(g).connect(getOutput())
      osc.start(now + t)
      osc.stop(now + t + 0.18)
    }
  } catch {
    /* noop */
  }
}
