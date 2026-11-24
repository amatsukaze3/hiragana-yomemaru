// Apple の 音声認識（iPad）の まね。start から START_MS で きけるように なる。つづけて よむと ことばに かきかえる
// 11-24 の iPad の ようす：みじかい 1もじは とちゅうの けっかが でず（PARTIAL_MIN もじ たまって やっと でる）、とめると すぐ でる。
// 声の 知らせ（soundstart・speechstart）は 1かいの 音声認識で さいしょの 音の 1かい だけ（__EVENTS=0 で ださない）。
// __NOISE=1：音声認識が はじまって すぐ まわりの 音で 知らせを つかいきる（教室）
(() => {
  const START_MS = window.__START_MS || 300
  const PARTIAL_MIN = window.__PARTIAL_MIN || 3
  const EVENTS = window.__EVENTS !== 0
  const NOISE = !!window.__NOISE
  const MERGE = { かき: '柿', すし: '寿司', あい: '愛', うえ: '上', いえ: '家', かこ: '過去', くき: '茎', さけ: '酒', そこ: '底', せき: '席', けさ: '今朝', こけ: '苔', えき: '駅', おい: '甥', きく: '菊', しお: '塩', あき: '秋', いけ: '池', かさ: '傘', くさ: '草', うし: '牛', あさ: '朝', いす: '椅子' }
  window.__recogs = []
  class MockRecog {
    constructor() { this.lang = ''; this.continuous = true; this.interimResults = true; this.maxAlternatives = 1; this.running = false; this.stopping = false; this.heard = []; this.audio = []; window.__recogs.push(this) }
    start() {
      if (this.running) throw new Error('InvalidStateError')
      this.running = true; this.stopping = false; this.heard = []; this.audio = []; this.sounded = false
      this.readyAt = performance.now() + START_MS
      setTimeout(() => this.onstart && this.onstart(), 50)
      if (!window.__NO_AUDIOSTART) setTimeout(() => this.running && this.onaudiostart && this.onaudiostart(), START_MS - 50)
      if (NOISE) setTimeout(() => this.sound(), START_MS + 50)
    }
    text() { let s = this.heard.join(''); for (const k in MERGE) s = s.replace(k, MERGE[k]); return s }
    emit() { const t = this.text(); if (!t) return; const r = [{ transcript: t }]; this.onresult && this.onresult({ resultIndex: 0, results: [r] }) }
    stop() {
      if (!this.running || this.stopping) return
      this.stopping = true
      const at = performance.now()
      this.heard = this.audio.filter((a) => a.end <= at).map((a) => a.kana)
      setTimeout(() => { this.emit(); this.end() }, 120)
    }
    abort() { if (!this.running) return; this.stopping = true; setTimeout(() => this.end(), 30) }
    end() { if (!this.running) return; this.running = false; this.stopping = false; this.onend && this.onend() }
    ok() { return this.running && !this.stopping && performance.now() >= this.readyAt }
    sound() { if (!this.ok()) return; if (EVENTS && !this.sounded) { this.sounded = true; this.onsoundstart && this.onsoundstart(); this.onspeechstart && this.onspeechstart() } }
    say(kana) {
      if (!this.ok()) return false
      this.sound()
      this.audio.push({ kana, end: performance.now() + 300 })
      setTimeout(() => {
        if (!this.running || this.stopping) return
        const now = performance.now()
        this.heard = this.audio.filter((a) => a.end <= now).map((a) => a.kana)
        if (this.heard.length >= PARTIAL_MIN) this.emit()
      }, 400)
      return true
    }
  }
  window.webkitSpeechRecognition = MockRecog
  window.SpeechRecognition = MockRecog
  Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' })
  window.__say = (kana) => { const r = [...window.__recogs].reverse().find((x) => x.running); return r ? r.say(kana) : false }
})()
