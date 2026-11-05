/** こえの とうろく（その子の「あいうえお」）を この端末に保存する */
import { lsGet, lsSet } from './storage'

export interface Voiceprint {
  date: string
  name?: string
  C: number[][] // あ・い・う・え・お の形（各40点）
}

const KEY = 'yomemaru:voiceprint'

export function loadVoiceprint(): Voiceprint | null {
  try {
    const v = JSON.parse(lsGet(KEY) ?? 'null')
    return v && Array.isArray(v.C) && v.C.length === 5 ? v : null
  } catch {
    return null
  }
}

export function saveVoiceprint(v: Voiceprint) {
  lsSet(KEY, JSON.stringify(v))
}

export function clearVoiceprint() {
  lsSet(KEY, 'null')
}

/** iPhone・iPad は Apple の音声認識で判定するので、声の登録は使わない */
export function voiceprintUseful() {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  return !ios
}
