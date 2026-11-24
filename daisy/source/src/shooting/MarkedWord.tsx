/**
 * スタンプずかん・スタンプ ゲットの ことばで、その スタンプの 文字を 赤く する（「あり」の「あ」）。
 * ずかんでは スタンプの 上にも 赤い 文字を だし、タッチすると「あ … あり」と 文字と ことばを よむ（2026-11-24）
 */
import type { Kana } from '../data/kana'
import { sayKana, sayWord } from './voices'

/** ことばの なかの その 文字（さいしょの ひとつ）を 赤く */
export function MarkedWord({ id, word }: { id: Kana; word: string }) {
  const i = word.indexOf(id)
  if (i < 0) return <>{word}</>
  return (
    <>
      {word.slice(0, i)}
      <span className="text-red-500">{id}</span>
      {word.slice(i + id.length)}
    </>
  )
}

/** スタンプの 上に だす 文字 */
export const stampLetter = (id: Kana) => id

/** ずかんで タッチ：文字 → ことば（「あ … あり」） */
export function sayStampWord(id: Kana) {
  sayKana(id, () => window.setTimeout(() => sayWord(id), 250))
}
