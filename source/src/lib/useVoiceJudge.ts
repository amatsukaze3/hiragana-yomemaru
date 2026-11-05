import { useCallback, useEffect, useRef, useState } from 'react'
import type { Kana } from '../data/kana'
import { HybridVoiceJudge, type FrameInfo, type MicStatus, type PassSource } from './voice'

/**
 * 画面からハイブリッド判定エンジンを使うためのフック。
 * start() はボタンのタップから呼ぶ（iOS のマイク許可・自動再生対策）。
 */
export function useVoiceJudge(target: Kana | null, onPass: (src: PassSource) => void) {
  const engine = useRef<HybridVoiceJudge | null>(null)
  const [status, setStatus] = useState<MicStatus>('idle')
  const [asr, setAsr] = useState(false)
  const [heard, setHeard] = useState('')
  const frame = useRef<FrameInfo | null>(null)
  const passRef = useRef(onPass)
  passRef.current = onPass

  if (!engine.current) engine.current = new HybridVoiceJudge()

  useEffect(() => {
    const e = engine.current!
    e.onPass = (src) => passRef.current(src)
    e.onStatus = (s, a) => {
      setStatus(s)
      setAsr(a)
    }
    e.onHeard = (t) => setHeard(t)
    e.onFrame = (f) => {
      frame.current = f
    }
    return () => e.stop()
  }, [])

  useEffect(() => {
    engine.current!.setTarget(target)
    setHeard('')
  }, [target])

  const start = useCallback(() => engine.current!.start(), [])
  const stop = useCallback(() => engine.current!.stop(), [])
  const hold = useCallback((ms: number) => engine.current!.hold(ms), [])

  const lastError = () => engine.current!.lastError
  return { status, asr, start, stop, hold, frame, lastError, heard }
}
