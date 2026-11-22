import { KANA_INFO, type Kana } from '../data/kana'
import { hasClip, playVoice, registerClips, speak } from '../lib/audio'

/**
 * フローラちゃんシューティングの こえ（VOICEVOX:東北ずん子）
 * - カタカナ 1もじ … カタカナフローラちゃん本体の 音声（src/assets/voice/*.mp3）
 * - ことば・かけごえ … tools/voice で つくった 音声（src/assets/voice/shoot/*.mp3）
 * 音声ファイルが ないときは なにも ならさない（フローラちゃん いがいの こえに しないため）。
 */
const FILES = import.meta.glob('../assets/voice/shoot/*.mp3', { eager: true, import: 'default' }) as Record<string, string>
const map: Record<string, string> = {}
for (const [path, url] of Object.entries(FILES)) map[`shoot:${path.split('/').pop()!.replace('.mp3', '')}`] = url
registerClips(map)

export type Line = 'start' | 'resume' | 'over' | 'record' | 'complete' | 'miss' | 'saved' | 'gold'

function play(name: string, onEnd?: () => void) {
  const key = `shoot:${name}`
  if (hasClip(key)) playVoice(key, onEnd)
  else onEnd?.()
}

/** かけごえ（スタート・おしまい など） */
export function sayLine(l: Line, onEnd?: () => void) {
  play(`sh_${l}`, onEnd)
}

/** カタカナ 1もじ */
export function sayKana(k: string, onEnd?: () => void) {
  speak(k, { onEnd })
}

/** 「〇〇の スタンプ、ゲットだよ！」 */
export function sayStamp(id: Kana, onEnd?: () => void) {
  play(`s_${KANA_INFO[id].romaji}`, onEnd)
}

/** ことば だけ（ずかんで タッチしたとき） */
export function sayWord(id: Kana, onEnd?: () => void) {
  play(`w_${KANA_INFO[id].romaji}`, onEnd)
}

/** これで ばっちり モードの セリフ */
export type BtLine = 'intro' | 's1' | 's2' | 's3' | 's4' | 'test' | 'perfect' | 'boss' | 'win'
export function sayBt(l: BtLine, onEnd?: () => void) {
  play(`bt_${l}`, onEnd)
}

/** じゃままるくんの セリフ（VOICEVOX:黒沢冴白） */
export function sayJama(key: string, onEnd?: () => void) {
  play(`jm_${key}`, onEnd)
}
