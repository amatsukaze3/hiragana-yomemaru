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
  const info = KANA_INFO[char]
  // 絵が まだ ない カードは「もじ＋ことば」の カード
  const noArt = variant === 'picture' && !a.url
  // 何文字も ある よみ（きゃ・おかあさん）は 横長の カード
  const wide = Math.min(3.2, Math.max(1, char.length * 0.72))
  const ratio = variant === 'picture' && !noArt ? a.aspect : noArt ? Math.max(1000 / 760, wide) : wide
  const { ref, size } = useFit(ratio)

  // 既定の線画なら元のカードと同じ位置に、差し替えた絵なら中央に重ねる
  const pos = noArt ? { cx: 50, cy: 42, h: 46 } : variant === 'picture' && !a.custom ? info.letter : { cx: 50, cy: 50, h: 46 }
  // 横に はみださないよう、文字数で 大きさを おさえる
  const fit = (px: number, box: number) => Math.min(px, (box * 0.88) / Math.max(1, char.length))
  const letterPx = variant === 'picture' && !noArt ? fit((size.h * pos.h) / 100 / 0.86, size.w) : fit(size.h * (noArt ? 0.5 : 0.74), size.w)

  return (
    <div ref={ref} className="relative flex h-full w-full items-center justify-center">
      <motion.button
        type="button"
        onClick={onTap}
        aria-label={`${char}（${info.word}）`}
        className="relative overflow-hidden rounded-[28px] border-4 border-amber-200 bg-white shadow-[0_6px_0_#fde68a]"
        style={{ width: size.w, height: size.h }}
        whileTap={{ scale: 0.97 }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {variant === 'letter' && char.length === 1 && <MasuGrid />}
        {noArt && info.word && info.word !== char && (
          <span className="font-card pointer-events-none absolute inset-x-0 bottom-[9%] whitespace-nowrap text-center leading-none text-stone-500" style={{ fontSize: Math.min(size.h * 0.16, (size.w * 0.85) / info.word.length) }}>
            {info.word}
          </span>
        )}
        {variant === 'picture' && !noArt && (
          <img src={a.url} alt={info.word} draggable={false} className={`absolute inset-0 h-full w-full object-contain ${info.framed && !a.custom ? '' : 'p-[3%]'}`} />
        )}
        {(variant === 'letter' || noArt || a.overlay) && !hideLetter && (
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
        {variant === 'picture' && !a.custom && a.overlay && !hideLetter &&
          (info.labels ?? []).map((lb) => (
            <span
              key={lb.text}
              className="font-card pointer-events-none absolute whitespace-nowrap leading-none text-stone-900"
              style={{ left: `${lb.cx}%`, top: `${lb.cy}%`, fontSize: (size.h * lb.h) / 100 / 0.86, transform: 'translate(-50%, -50%)' }}
            >
              {lb.text}
            </span>
          ))}
        {children}
      </motion.button>
    </div>
  )
}
