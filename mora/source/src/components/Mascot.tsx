import { motion } from 'motion/react'
import yomemaru from '../assets/yomemaru.webp'

/** マスコット「よめ丸くん」 */
export function Mascot({ size = 140, mood = 'happy' }: { size?: number; mood?: 'happy' | 'cheer' }) {
  return (
    <motion.img
      src={yomemaru}
      alt="よめ丸くん"
      draggable={false}
      style={{ height: size, width: 'auto' }}
      className="select-none"
      animate={mood === 'cheer' ? { y: [0, -14, 0], rotate: [0, -6, 6, 0] } : { y: [0, -6, 0] }}
      transition={{ duration: mood === 'cheer' ? 0.9 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}
