import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { KANA_INFO, type Kana } from '../data/kana'
import { useCards } from '../lib/cards'
import { cardRomaji, subRomaji, useRomajiStyle, wordRomaji } from '../lib/romaji'
import { ROMA_FONT, ROMA_WEIGHT } from '../lib/fourLines'
import { RomajiBoard, useRomaFontTick } from './RomajiBoard'

/** 絵の 上に かさねる ローマ字の 大きさ：高さ h（px）を めやすに、はば maxW に おさめる */
function fitPx(text: string, h: number, maxW: number) {
  const c = (fitPx as unknown as { c?: CanvasRenderingContext2D }).c ??= document.createElement('canvas').getContext('2d')!
  c.font = `${ROMA_WEIGHT} 100px ${ROMA_FONT}`
  const w = c.measureText(text).width || 1
  return Math.min(h, (100 * maxW) / w)
}

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
      <line x1="50" y1="3" x2="50" y2="97" stroke="#c4b5fd" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
      <line x1="3" y1="50" x2="97" y2="50" stroke="#c4b5fd" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
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

/** カード（絵＋ローマ字 / 4本線の ローマ字だけ）。ローマ字は Andika */
export function Card({ char, variant, onTap, hideLetter, children }: CardProps) {
  const { art } = useCards()
  const a = art[char]
  const info = KANA_INFO[char]
  const style = useRomajiStyle()
  const roma = cardRomaji(char, style)
  const sub = subRomaji(char, style)
  useRomaFontTick(roma)
  // ローマ字は 横に ながいので「もじ だけ」の カードは 横長に
  const ratio = variant === 'picture' ? a.aspect : 1.3
  const { ref, size } = useFit(ratio)

  // 既定の線画なら元のカードと同じ位置に、差し替えた絵なら中央に重ねる
  const pos = variant === 'picture' && !a.custom ? info.letter : { cx: 50, cy: 50, h: 46 }
  // 小文字は かなより 背が ひくいので すこし 大きめ。絵の はば（の 6わり）からは はみださない
  const labels = variant === 'picture' && !a.custom ? (info.labels ?? []) : []
  const prefix = labels.filter((lb) => Math.abs(lb.cy - pos.cy) < 10 && lb.cx < pos.cx)
  const others = labels.filter((lb) => !prefix.includes(lb))
  const letterPx = fitPx(roma, (size.h * pos.h) / 100, size.w * (labels.length ? 0.32 : 0.5))

  return (
    <div ref={ref} className="relative flex h-full w-full items-center justify-center">
      <motion.button
        type="button"
        onClick={onTap}
        aria-label={`${roma}（${info.hira}・${wordRomaji(info.word, style)}）`}
        className="relative overflow-hidden rounded-[28px] border-4 border-amber-200 bg-white shadow-[0_6px_0_#fde68a]"
        style={{ width: size.w, height: size.h }}
        whileTap={{ scale: 0.97 }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {variant === 'letter' && !hideLetter && <RomajiBoard text={roma} sub={sub} />}
        {variant === 'picture' && (
          <img src={a.url} alt={info.word} draggable={false} className={`absolute inset-0 h-full w-full object-contain ${info.framed && !a.custom ? '' : 'p-[3%]'}`} />
        )}
        {/* 文字と おなじ 行の すぐ 左に ある ことば（きり＋ん）は、ローマ字では 文字の まえに つなげて 小さく（kiri n） */}
        {variant === 'picture' && a.overlay && !hideLetter && (
          <span
            className="font-roma pointer-events-none absolute flex items-baseline whitespace-nowrap leading-none text-stone-900"
            style={{
              left: `${prefix.length ? 50 : pos.cx}%`,
              top: `${pos.cy}%`,
              fontSize: letterPx,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {prefix.map((lb) => (
              <span key={lb.text} className="mr-[0.08em] text-stone-500" style={{ fontSize: '0.55em' }}>
                {wordRomaji(lb.text, style)}
              </span>
            ))}
            {roma}
          </span>
        )}
        {variant === 'picture' && !a.custom && a.overlay && !hideLetter &&
          others.map((lb) => (
            <span
              key={lb.text}
              className="font-roma pointer-events-none absolute whitespace-nowrap leading-none text-stone-900"
              style={{ left: `${lb.cx}%`, top: `${lb.cy}%`, fontSize: (size.h * lb.h) / 100 / 0.7, transform: 'translate(-50%, -50%)' }}
            >
              {wordRomaji(lb.text, style)}
            </span>
          ))}
        {/* 絵の なまえ（ローマ字 ＋ 小さな ひらがな）。ことばを ローマ字で よむ れんしゅうにも なる */}
        {variant === 'picture' && !a.custom && !hideLetter && (
          <span
            className="pointer-events-none absolute bottom-[3%] left-1/2 flex -translate-x-1/2 items-baseline gap-2 whitespace-nowrap rounded-full bg-white/85 px-3 py-0.5 leading-tight"
            style={{ fontSize: Math.max(12, size.h * 0.065) }}
          >
            <span className="font-roma text-stone-800">{wordRomaji(info.word, style)}</span>
            <span className="font-card text-stone-500" style={{ fontSize: '0.7em' }}>{info.word.replace(/ /g, '')}</span>
          </span>
        )}
        {children}
      </motion.button>
    </div>
  )
}
