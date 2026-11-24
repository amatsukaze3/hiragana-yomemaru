import type { Kana } from '../data/kana'

/**
 * カンペキテストの もんだい：3もじ × 3かい ＝ 9もんを ぜんぶ まぜて ランダムに ならべる。
 * - おなじ もじが つづけて でない
 * - 「3もんごとに 3もじが 1かいずつ」の じゅんばんどおりの ならびには しない
 */
export function makeTestOrder(kana: Kana[], times = 3): Kana[] {
  const items = kana.flatMap((k) => Array<Kana>(times).fill(k))
  const blocky = (o: Kana[]) => {
    for (let i = 0; i + kana.length <= o.length; i += kana.length) if (new Set(o.slice(i, i + kana.length)).size !== kana.length) return false
    return true
  }
  let best = items
  for (let t = 0; t < 500; t++) {
    const o = [...items]
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[o[i], o[j]] = [o[j], o[i]]
    }
    best = o
    if (o.every((k, i) => i === 0 || o[i - 1] !== k) && !(kana.length > 1 && blocky(o))) return o
  }
  return best
}
