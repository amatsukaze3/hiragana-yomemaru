import { useCallback, useEffect, useRef, useState } from 'react'
import type { Kana } from '../data/kana'
import { voiceprintRows } from './voiceprint'
import { HybridVoiceJudge, passMode, type FrameInfo, type MicStatus, type MissInfo, type PassMode, type PassSource } from './voice'

/**
 * 画面からハイブリッド判定エンジンを使うためのフック。
 * start() はボタンのタップから呼ぶ（iOS のマイク許可・自動再生対策）。
 * onPass の 2つめは 合格した 文字（シューティングで ほかの カードを よんだ ときは その カードの 文字）
 */
export function useVoiceJudge(target: Kana | null, onPass: (src: PassSource, kana: Kana) => void, questionKey?: number, onMiss?: (info?: MissInfo) => void) {
  const engine = useRef<HybridVoiceJudge | null>(null)
  const [status, setStatus] = useState<MicStatus>('idle')
  const [asr, setAsr] = useState(false)
  const [heard, setHeard] = useState('')
  const frame = useRef<FrameInfo | null>(null)
  const passRef = useRef(onPass)
  passRef.current = onPass
  const missRef = useRef(onMiss)
  missRef.current = onMiss

  if (!engine.current) engine.current = new HybridVoiceJudge()

  useEffect(() => {
    const e = engine.current!
    e.onPass = (src, kana) => passRef.current(src, kana)
    e.onStatus = (s, a) => {
      setStatus(s)
      setAsr(a)
    }
    e.onHeard = (t) => setHeard(t)
    e.onMiss = (info) => missRef.current?.(info)
    e.onFrame = (f) => {
      frame.current = f
    }
    // 合格の きじゅん（せんせいメニューの しおん ごうかく／ぼおん ごうかく）。かえたら すぐ うつす
    e.setVowelMode(passMode.get() === 'vowel')
    const unsub = passMode.subscribe((m) => e.setVowelMode(m === 'vowel'))
    return () => {
      unsub()
      e.stop()
    }
  }, [])

  useEffect(() => {
    engine.current!.setTarget(target)
    setHeard('')
  }, [target, questionKey])

  const start = useCallback((opts?: { forRegister?: boolean }) => {
    const e = engine.current!
    e.forceAnalyser = !!opts?.forRegister
    // 登録があれば、その子の声とくらべて判定する
    e.setVoiceprint(opts?.forRegister ? null : voiceprintRows())
    return e.start()
  }, [])
  const capture = useCallback((cb: (shape: number[] | null) => void, lockMs?: number, minRatio?: number) => engine.current!.capture(cb, lockMs, minRatio), [])
  const cancelCapture = useCallback(() => engine.current!.cancelCapture(), [])
  const refreshVoiceprint = useCallback(() => engine.current!.setVoiceprint(voiceprintRows()), [])
  const stop = useCallback(() => engine.current!.stop(), [])
  const hold = useCallback((ms: number) => engine.current!.hold(ms), [])

  /** iPhone・iPad：マイクが きこえない すきまが ある（シューティングは その あいだ カードを とめる） */
  const hasMicGaps = useCallback(() => engine.current!.hasMicGaps(), [])
  /** いま よめば きこえるか */
  const canHear = useCallback(() => engine.current!.canHear(), [])
  /** いま こどもが よんで いて、けっかを まって いる（シューティングは カードを とめる） */
  const judging = useCallback(() => engine.current!.judging(), [])
  /** ほかに よんでも よい 文字（シューティングの ほかの カード）。音声認識で きいた とき だけ つかう */
  const setExtraTargets = useCallback((list: Kana[]) => engine.current!.setExtras(list), [])
  /** iPhone・iPad：声の 知らせが こない ときの ききとり窓（ミリびょう） */
  const setListenWindow = useCallback((ms: number) => {
    engine.current!.listenWindowMs = ms
  }, [])
  const pause = useCallback(() => engine.current!.pause(), [])
  const resume = useCallback(() => engine.current!.resume(), [])
  const lastError = () => engine.current!.lastError
  return { status, asr, start, stop, hold, frame, lastError, heard, capture, cancelCapture, refreshVoiceprint, pause, resume, hasMicGaps, canHear, judging, setExtraTargets, setListenWindow }
}

/** 合格の きじゅん（しおん ごうかく／ぼおん ごうかく）。せんせいメニューで かわると 画面も かきなおす */
export function usePassMode(): PassMode {
  const [m, setM] = useState<PassMode>(passMode.get)
  useEffect(() => {
    setM(passMode.get())
    return passMode.subscribe(setM)
  }, [])
  return m
}
