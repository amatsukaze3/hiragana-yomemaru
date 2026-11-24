import { kvDelete, kvGet, kvSet } from './storage'

export type FontStatus = 'user' | 'system' | 'fallback' | 'checking'

const USER_FAMILY = 'YomemaruCardUser'
const FONT_KEY = 'font:user'
let userFace: FontFace | null = null

/** 登録済みフォント（iPad 等で UDデジタル教科書体 NK-B を使うため）を読み込む */
export async function loadUserFont(): Promise<boolean> {
  const stored = await kvGet<{ name: string; data: ArrayBuffer }>(FONT_KEY)
  if (!stored) return false
  return applyFont(stored.data)
}

async function applyFont(data: ArrayBuffer): Promise<boolean> {
  try {
    if (userFace) document.fonts.delete(userFace)
    const face = new FontFace(USER_FAMILY, data, { weight: '100 900', display: 'block' })
    await face.load()
    document.fonts.add(face)
    userFace = face
    return true
  } catch {
    return false
  }
}

export async function registerUserFont(file: File): Promise<boolean> {
  const data = await file.arrayBuffer()
  const ok = await applyFont(data)
  if (ok) await kvSet(FONT_KEY, { name: file.name, data })
  return ok
}

export async function clearUserFont() {
  if (userFace) document.fonts.delete(userFace)
  userFace = null
  await kvDelete(FONT_KEY)
}

export async function userFontName(): Promise<string | null> {
  const stored = await kvGet<{ name: string }>(FONT_KEY)
  return stored?.name ?? null
}

/** いまカードに使われているフォントを調べる */
export async function detectFontStatus(): Promise<FontStatus> {
  if (userFace?.status === 'loaded') return 'user'
  try {
    const faces = await document.fonts.load('600 48px YomemaruNKB', 'あいうえお')
    if (faces.length > 0) return 'system'
  } catch {
    /* noop */
  }
  return 'fallback'
}
