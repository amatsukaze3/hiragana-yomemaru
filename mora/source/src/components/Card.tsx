import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { KANA_INFO, type Kana } from '../data/kana'
import { useCards } from '../lib/cards'

/** 親の箱の中に、指定の縦横比でおさまる大きさを求める */
function useFit(ratio: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const W = el.clientWidth
      const H = el.clientHeight
      const w = Math.min(W, H * ratio)
      setSize({ w, h: w / ratio })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ratio])
  return { ref, size }
}

/** 学習帳の十字リーダー（点線） */
export function MasuGrid() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <line x1="50" y1="3" x2="50" y2="97" stroke="#fdba74" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
      <line x1="3" y1="50" x2="97" y2="50" stroke="#fdba74" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** ことばの 一部を 赤く する */
function Marked({ text, marks }: { text: string; marks: [number, number][] }) {
  const out: ReactNode[] = []
  let i = 0
  for (const [a, b] of marks) {
    if (a > i) out.push(text.slice(i, a))
    out.push(
      <span key={a} className="text-red-500">
        {text.slice(a, b)}
      </span>,
    )
    i = b
  }
  if (i < text.length) out.push(text.slice(i))
  return <>{out}</>
}

interface CardProps {
  char: Kana
  variant: 'picture' | 'letter'
  onTap?: () => void
  hideLetter?: boolean
  children?: ReactNode
}

/** カード（絵＋文字 / 文字だけ）。文字は UDデジタル教科書体 NK-B */
export function Card({ char, variant, onTap, hideLetter, children }: CardProps) {
  const { art } = useCards()
  const a = art[char]
  // こえの とうろく の「あ・い・う・え・お・ん」は カードの データが ないので、もじ だけで 出す
  const info = KANA_INFO[char] as (typeof KANA_INFO)[string] | undefined
  const caption = info?.caption ?? char
  // 絵が まだ ない カードは「もじ＋ことば」の カード
  const noArt = variant === 'picture' && !a.url
  // はじめから 入っている 絵（まんなかに 絵、下に ことば）
  const builtIn = variant === 'picture' && !noArt && !a.custom
  // 何文字も ある よみ（きゃ・おかあさん）は 横長の カード
  const wide = Math.min(3.2, Math.max(1, char.length * 0.72))
  const ratio = builtIn && info ? info.imageAspect : variant === 'picture' && !noArt ? a.aspect : noArt ? Math.max(1000 / 760, wide) : wide
  const { ref, size } = useFit(ratio)

  // はじめの絵・もじだけの カードは 上よりに（下に ことばを 書く）、差し替えた絵は 中央に 重ねる
  const pos = noArt ? { cx: 50, cy: 42, h: 46 } : builtIn && info ? info.letter : { cx: 50, cy: 50, h: 46 }
  // 横に はみださないよう、文字数で 大きさを おさえる
  const fit = (px: number, box: number) => Math.min(px, (box * 0.88) / Math.max(1, char.length))
  const letterPx = variant === 'picture' && !noArt ? fit((size.h * pos.h) / 100 / 0.86, size.w) : fit(size.h * (noArt ? 0.5 : 0.74), size.w)
  // 大きな 文字を 重ねるか（みゅ・りゃ・びゅ は 絵が 文字 そのものなので 重ねない）
  const showLetter = (variant === 'letter' || noArt || a.overlay) && !hideLetter && !(builtIn && info?.letterArt)
  // 下に 小さく ことば（よむ ところを 赤く）
  const showCaption = (builtIn || noArt) && !hideLetter
  const capPx = Math.min(size.h * 0.12, (size.w * 0.8) / Math.max(1, caption.length))

  return (
    <div ref={ref} className="relative flex h-full w-full items-center justify-center">
      <motion.button
        type="button"
        onClick={onTap}
        aria-label={caption === char ? char : `${char}（${caption}）`}
        className="relative overflow-hidden rounded-[28px] border-4 border-amber-200 bg-white shadow-[0_6px_0_#fde68a]"
        style={{ width: size.w, height: size.h }}
        whileTap={{ scale: 0.97 }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {variant === 'letter' && char.length === 1 && <MasuGrid />}
        {variant === 'picture' && !noArt && (
          <img src={a.url} alt={caption} draggable={false} className={`absolute inset-0 h-full w-full object-contain ${builtIn ? '' : 'p-[3%]'}`} />
        )}
        {showLetter && (
          <span
            className="font-card pointer-events-none absolute whitespace-nowrap leading-none text-stone-900"
            style={{
              left: `${pos.cx}%`,
              top: `${pos.cy}%`,
              fontSize: letterPx,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {char}
          </span>
        )}
        {showCaption && (
          <span className="font-card pointer-events-none absolute inset-x-0 bottom-[5%] whitespace-nowrap text-center leading-none text-stone-900" style={{ fontSize: capPx }}>
            <Marked text={caption} marks={info?.marks ?? []} />
          </span>
        )}
        {children}
      </motion.button>
    </div>
  )
}
