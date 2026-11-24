/**
 * スタンプずかん・スタンプ ゲットの ことばで、その スタンプの 文字を 赤く する（「あり」の「あ」）。
 * ずかんでは スタンプの 上にも 赤い 文字を だし、タッチすると「あ … あり」と 文字と ことばを よむ（2026-11-24）
 */
import { Fragment } from 'react'
import type { Kana } from '../data/kana'
import { cardRomaji, morae } from '../lib/romaji'
import { sayKana, sayWord } from './voices'

/** ことばの ローマ字の なかの その 文字（さいしょの ひとつ。ari の a、kirin の n）を 赤く */
export function MarkedWord({ id, word }: { id: Kana; word: string }) {
  const ms = morae(word)
  const at = ms.findIndex((m) => m.key === id)
  return (
    <>
      {ms.map((m, j) =>
        j === at ? (
          <span key={j} className="text-red-500">
            {m.roma}
          </span>
        ) : (
          <Fragment key={j}>{m.roma}</Fragment>
        ),
      )}
    </>
  )
}

/** スタンプの 上に だす 文字（a・shi） */
export const stampLetter = (id: Kana) => cardRomaji(id)

/** ずかんで タッチ：文字 → ことば（「あ … あり」） */
export function sayStampWord(id: Kana) {
  sayKana(id, () => window.setTimeout(() => sayWord(id), 250))
}
