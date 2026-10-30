import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { KANA, KANA_INFO, type Kana } from '../data/kana'
import { kvDelete, kvGet, kvSet } from './storage'

export interface CardArt {
  url: string
  aspect: number
  custom: boolean
  /** 絵の上に UDデジタル教科書体 NK-B の文字を重ねるか */
  overlay: boolean
}

interface StoredCard {
  blob: Blob
  aspect: number
  overlay: boolean
}

interface CardsApi {
  art: Record<Kana, CardArt>
  setImage: (k: Kana, file: File) => Promise<void>
  setOverlay: (k: Kana, on: boolean) => Promise<void>
  reset: (k: Kana) => Promise<void>
}

const Ctx = createContext<CardsApi | null>(null)

function defaults(): Record<Kana, CardArt> {
  const out = {} as Record<Kana, CardArt>
  for (const k of KANA) {
    out[k] = { url: KANA_INFO[k].image, aspect: KANA_INFO[k].imageAspect, custom: false, overlay: true }
  }
  return out
}

function measure(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalWidth / Math.max(1, img.naturalHeight))
    img.onerror = () => resolve(1)
    img.src = url
  })
}

export function CardsProvider({ children }: { children: ReactNode }) {
  const [art, setArt] = useState<Record<Kana, CardArt>>(defaults)

  useEffect(() => {
    let alive = true
    ;(async () => {
      for (const k of KANA) {
        const s = await kvGet<StoredCard>(`card:${k}`)
        if (s && alive) {
          const url = URL.createObjectURL(s.blob)
          setArt((a) => ({ ...a, [k]: { url, aspect: s.aspect, custom: true, overlay: s.overlay } }))
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const setImage = useCallback(async (k: Kana, file: File) => {
    const url = URL.createObjectURL(file)
    const aspect = await measure(url)
    // 手持ちのカードには文字が入っている想定なので、重ね文字は最初オフ
    await kvSet(`card:${k}`, { blob: file, aspect, overlay: false } satisfies StoredCard)
    setArt((a) => ({ ...a, [k]: { url, aspect, custom: true, overlay: false } }))
  }, [])

  const setOverlay = useCallback(async (k: Kana, on: boolean) => {
    const s = await kvGet<StoredCard>(`card:${k}`)
    if (s) await kvSet(`card:${k}`, { ...s, overlay: on })
    setArt((a) => ({ ...a, [k]: { ...a[k], overlay: on } }))
  }, [])

  const reset = useCallback(async (k: Kana) => {
    await kvDelete(`card:${k}`)
    setArt((a) => ({ ...a, [k]: defaults()[k] }))
  }, [])

  const api = useMemo(() => ({ art, setImage, setOverlay, reset }), [art, setImage, setOverlay, reset])
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useCards(): CardsApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('CardsProvider missing')
  return v
}
