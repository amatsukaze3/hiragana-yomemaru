import { KANA_INFO, type Kana } from '../data/kana'
import { hasClip, playVoice, registerClips, speak } from '../lib/audio'

/**
 * よめ丸シューティングの ずんだもんの こえ（VOICEVOX:ずんだもん）
 * - ひらがな 1もじ … よめ丸くん本体の 音声（src/assets/voice/*.mp3）
 * - ことば・かけごえ … tools/shoot-voice で つくった 音声（src/assets/voice/shoot/*.mp3）
 * 音声ファイルが ないときは なにも ならさない（ずんだもん いがいの こえに しないため）。
 */
const FILES = import.meta.glob('../assets/voice/shoot/*.mp3', { eager: true, import: 'default' }) as Record<string, string>
const map: Record<string, string> = {}
for (const [path, url] of Object.entries(FILES)) map[`shoot:${path.split('/').pop()!.replace('.mp3', '')}`] = url
registerClips(map)

export type Line = 'start' | 'resume' | 'over' | 'record' | 'complete' | 'miss' | 'saved'

function play(name: string, onEnd?: () => void) {
  const key = `shoot:${name}`
  if (hasClip(key)) playVoice(key, onEnd)
  else onEnd?.()
}

/** かけごえ（スタート・おしまい など） */
export function sayLine(l: Line, onEnd?: () => void) {
  play(`sh_${l}`, onEnd)
}

/** ひらがな 1もじ */
export function sayKana(k: string, onEnd?: () => void) {
  speak(k, { onEnd })
}

/** 「〇〇の スタンプ、ゲットなのだ！」 */
export function sayStamp(id: Kana, onEnd?: () => void) {
  play(`s_${KANA_INFO[id].romaji}`, onEnd)
}

/** ことば だけ（ずかんで タッチしたとき） */
export function sayWord(id: Kana, onEnd?: () => void) {
  play(`w_${KANA_INFO[id].romaji}`, onEnd)
}
