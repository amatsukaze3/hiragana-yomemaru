import { KANA_INFO, type Kana } from '../data/kana'
import { useCards } from '../lib/cards'

/** カードの絵で つくった まるい スタンプ */
export function Stamp({ id, size = 96, owned = true, tilt = 0 }: { id: Kana; size?: number; owned?: boolean; tilt?: number }) {
  const { art } = useCards()
  const info = KANA_INFO[id]
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full ${owned ? 'bg-rose-50' : 'bg-stone-100'}`}
      style={{
        width: size,
        height: size,
        transform: `rotate(${tilt}deg)`,
        boxShadow: owned ? `0 0 0 ${Math.max(2, size * 0.035)}px #fb7185, 0 0 0 ${Math.max(4, size * 0.07)}px #fff, 0 0 0 ${Math.max(5, size * 0.085)}px #fda4af` : 'inset 0 0 0 2px #e7e5e4',
      }}
      aria-label={owned ? `${info.word}の スタンプ` : 'まだ もっていない スタンプ'}
    >
      <img
        src={art[id].url}
        alt=""
        draggable={false}
        className="h-[78%] w-[78%] object-contain mix-blend-multiply"
        style={owned ? undefined : { filter: 'grayscale(1) blur(3px)', opacity: 0.18 }}
      />
      {!owned && <span className="absolute text-stone-300" style={{ fontSize: size * 0.4, fontWeight: 700 }}>?</span>}
    </span>
  )
}
