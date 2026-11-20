/**
 * じゃままるくん（カンペキテストの ボス。カタカナを よませないように じゃまを する）
 * - enter  … じゃままるくんが あらわれる
 * - throw  … もじカードを なげる（とんでくる とちゅう）
 * - ready  … カードが うかんでいる（ここで よむ）
 * - hit    … スーパービーム！（カードを つらぬいて じゃままるくんに あたる）
 * - defeat … じゃままるくんが やられて とんでいく
 */
export type BossState = 'enter' | 'throw' | 'ready' | 'hit' | 'defeat'

/**
 * じゃままるくんの セリフ。
 * こえ（VOICEVOX:黒沢冴白 … voice/shoot/jm_<key>.mp3）が あるのは enter・hit0〜4・defeat だけ。
 * なげる とき（t0・throw・danger）と「どうした〜？」（slow）は、こどもが よんでいる じかんなので ふきだし だけに する。
 */
export const JAMA_TEXT = {
  enter: 'No hiragana for you!',
  t0: 'Here I go! Take that!',
  throw0: 'Can you read THIS?',
  throw1: 'Hyah!',
  throw2: 'Not done yet!',
  throw3: 'Try this one!',
  throw4: 'How about this?',
  throw5: 'You can’t read it!',
  hit0: 'Ouch!',
  hit1: 'Grrr…',
  hit2: 'No way!',
  hit3: 'Whoa!',
  hit4: 'What?!',
  slow: 'What’s wrong? Can’t read it?',
  danger: 'Uh-oh…!',
  defeat: 'You win… I’ll be back!',
} as const
export type JamaKey = keyof typeof JAMA_TEXT

/** いまの じょうたいで じゃままるくんが いう セリフ */
export function jamaKey(state: BossState, idx: number, total: number, slow: boolean): JamaKey {
  if (state === 'enter') return 'enter'
  if (state === 'defeat') return 'defeat'
  if (state === 'hit') return `hit${idx % 5}` as JamaKey
  if (slow) return 'slow'
  if (idx === 0) return 't0'
  if (total - idx <= 3) return 'danger'
  return `throw${idx % 6}` as JamaKey
}

