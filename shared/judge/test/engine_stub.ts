// テスト台用：音まわりを まねた エンジン（アプリの voice.ts と おなじ かたち）
import { JudgeEngine } from '../engine'
import type { Script } from '../match'
import { getAudioContext, onFloraVoice, setMicActive } from './audio_stub'

export class HybridVoiceJudge extends JudgeEngine {
  constructor(script: Script = ((globalThis as { process?: { env?: Record<string, string> } }).process?.env?.SCRIPT as Script) ?? 'kata') {
    super({ getAudioContext: getAudioContext as unknown as () => AudioContext, onMascotVoice: onFloraVoice, setMicActive }, { script, logKey: null })
  }
}
