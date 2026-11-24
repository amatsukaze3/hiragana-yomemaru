/**
 * スタンプずかん・スタンプ ゲットの ことばで、その スタンプの 文字を 赤く する（「あり」の「あ」）。
 * ずかんでは スタンプの 上にも 赤い 文字を だし、タッチすると「あ … あり」と 文字と ことばを よむ（2026-11-24）
 */
import type { ReactNode } from 'react'
import { KANA_INFO, type Kana } from '../data/kana'
import { sayKana, sayWord } from './voices'

/** ことば（caption）の うち 赤く する ところ（カードと おなじ marks）を 赤く */
export function MarkedWord({ id, word }: { id: Kana; word: string }) {
  const info = KANA_INFO[id]
  const marks = info && info.caption === word ? info.marks : []
  const out: ReactNode[] = []
  let i = 0
  for (const [a, b] of marks) {
    if (a > i) out.push(word.slice(i, a))
    out.push(
      <span key={a} className="text-red-500">
        {word.slice(a, b)}
      </span>,
    )
    i = b
  }
  if (i < word.length) out.push(word.slice(i))
  return <>{out}</>
}

/** スタンプの 上に だす 文字：1つの 音の カードは その 音（が・きゃ）、ことばの カードは 赤い ところ（かあ・ん・っ） */
export function stampLetter(id: Kana) {
  const info = KANA_INFO[id]
  if (!info?.multi) return id
  const m = info.marks[0]
  return m ? info.caption.slice(m[0], m[1]) : id
}

/** ずかんで タッチ：1つの 音の カードは 音 → ことば（「が … めがね」）、ことばの カード・ことばの ない カードは ことば だけ */
export function sayStampWord(id: Kana) {
  const info = KANA_INFO[id]
  if (!info || info.multi || info.caption === id) sayWord(id)
  else sayKana(id, () => window.setTimeout(() => sayWord(id), 250))
}
