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
  enter: 'カタカナは よませないぞ〜！',
  t0: 'いくぞ〜！ えいっ！',
  throw0: 'これが よめるかな〜？',
  throw1: 'えいっ！',
  throw2: 'まだまだ〜！',
  throw3: 'つぎは これだ！',
  throw4: 'これなら どうだ！',
  throw5: 'よめるもんか〜！',
  hit0: 'いててっ！',
  hit1: 'ぐぬぬ…',
  hit2: 'やるな〜！',
  hit3: 'うわっ！',
  hit4: 'なにっ！？',
  slow: 'どうした〜？ よめないのか〜？',
  danger: 'ま、まずい…！',
  defeat: 'やられた〜！ おぼえてろ〜！',
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

