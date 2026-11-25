/**
 * 合格の きじゅん（先生が せんせいメニューで きりかえる）。
 *  - consonant（しおん ごうかく）… ふだんの 判定。子音の ある 文字は 子音まで よめて 合格（母音だけの よみは 合格に しない）
 *  - vowel（ぼおん ごうかく）… 構音が 育ちとちゅうの 子むけ。子音の ある 文字も 母音が あえば 合格（engine.ts の setVowelMode）
 * きりかえたら、先生が「しおん ごうかく」に もどすまで そのまま（この 端末の ブラウザに おぼえる。アプリごと）。
 */
export type PassMode = 'consonant' | 'vowel'

export interface PassModeStore {
  get(): PassMode
  set(m: PassMode): void
  /** かわった ときに よぶ（かえす 関数を よぶと やめる） */
  subscribe(fn: (m: PassMode) => void): () => void
}

export function createPassModeStore(key: string): PassModeStore {
  const subs = new Set<(m: PassMode) => void>()
  const read = (): PassMode => {
    try {
      return localStorage.getItem(key) === 'vowel' ? 'vowel' : 'consonant'
    } catch {
      return 'consonant'
    }
  }
  let cur = read()
  const emit = () => subs.forEach((f) => f(cur))
  // ほかの タブ・まど（シューティングを べつに ひらいて いる など）で かえた とき も あわせる
  if (typeof window !== 'undefined')
    window.addEventListener('storage', (e) => {
      if (e.key !== key) return
      const m = read()
      if (m === cur) return
      cur = m
      emit()
    })
  return {
    get: () => cur,
    set(m) {
      if (m === cur) return
      cur = m
      try {
        localStorage.setItem(key, m)
      } catch {
        /* noop */
      }
      emit()
    },
    subscribe(fn) {
      subs.add(fn)
      return () => void subs.delete(fn)
    },
  }
}
