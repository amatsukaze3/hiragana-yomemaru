/** 「おぼえる」の ステップ5（マイクで よむ）で 読めた ひらがなの記録（この端末の中だけ） */
import { KANA, type Kana } from '../data/kana'
import { lsGet, lsSet } from './storage'

const KEY = 'yomemaru:mastered'
const SEEN_KEY = 'yomemaru:shootSeen'
const BEST_KEY = 'yomemaru:shootBest'

export function loadMastered(): Set<Kana> {
  try {
    const a = JSON.parse(lsGet(KEY) ?? '[]') as Kana[]
    return new Set(a.filter((k) => KANA.includes(k)))
  } catch {
    return new Set()
  }
}

/** 新しく読めた文字なら true */
export function markMastered(k: Kana): boolean {
  const s = loadMastered()
  if (s.has(k)) return false
  s.add(k)
  lsSet(KEY, JSON.stringify([...s]))
  return true
}

export function clearMastered() {
  lsSet(KEY, '[]')
  lsSet(SEEN_KEY, '')
}

export function allMastered(s = loadMastered()) {
  return KANA.every((k) => s.has(k))
}

/** シューティングモードが あらわれた お知らせを もう見たか */
export const shootSeen = () => lsGet(SEEN_KEY) === '1'
export const setShootSeen = () => lsSet(SEEN_KEY, '1')

export const getShootBest = () => Number(lsGet(BEST_KEY) ?? 0) || 0
export const setShootBest = (n: number) => lsSet(BEST_KEY, String(n))
