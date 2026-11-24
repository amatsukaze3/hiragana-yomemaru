/**
 * 音声判定（マルチ合格エンジン）。しくみは リポジトリの shared/judge/ に あり、
 * よめ丸・はなちゃん・デイジーちゃん・フローラちゃん（小文字・おおもじ）で 共通（2026-11-25）。
 * ここでは ローマ字フローラちゃん（小文字） の 音まわり（audio.ts）と、文字の しゅるい（形の にた 文字が ちがう）・きろくの キーを わたす だけ。
 */
import { JudgeEngine } from '../../../../shared/judge/engine.ts'
import type { JudgeLogEntry } from '../../../../shared/judge/log.ts'
import { createPassModeStore } from '../../../../shared/judge/passMode.ts'
import { getAudioContext, onFloraVoice, setMicActive } from './audio'

export type { Bands, FrameInfo, MicStatus, MissInfo, PassSource } from '../../../../shared/judge/engine.ts'
export { formatLog } from '../../../../shared/judge/log.ts'
export type { JudgeLogEntry }
export type { PassMode } from '../../../../shared/judge/passMode.ts'

/** 合格の きじゅん（しおん ごうかく／ぼおん ごうかく）。せんせいメニューで きりかえ、もどすまで そのまま */
export const passMode = createPassModeStore('flora:passMode')

/** 判定の きろくの 保存キー（せってい の「判定の きろく」で みる） */
const LOG_KEY = 'flora:judgeLog'

export class HybridVoiceJudge extends JudgeEngine {
  constructor() {
    super({ getAudioContext, onMascotVoice: onFloraVoice, setMicActive }, { script: 'roma', logKey: LOG_KEY })
  }
}

export function loadJudgeLog(): JudgeLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') as JudgeLogEntry[]
  } catch {
    return []
  }
}

export function clearJudgeLog() {
  try {
    localStorage.removeItem(LOG_KEY)
  } catch {
    /* noop */
  }
}
