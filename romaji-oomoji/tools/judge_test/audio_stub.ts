const N = 2048
export const getAudioContext = () => ({
  sampleRate: 48000,
  state: 'running',
  resume: async () => {},
  createMediaStreamSource: () => ({ connect: () => {}, disconnect: () => {} }),
  createAnalyser: () => ({ fftSize: N, frequencyBinCount: N / 2, context: { sampleRate: 48000 }, smoothingTimeConstant: 0, minDecibels: -130, maxDecibels: 0, getFloatTimeDomainData: (a: Float32Array) => a.fill(0), getByteFrequencyData: (a: Uint8Array) => a.fill(0) }),
})
export const setMicActive = () => {}
/** フローラちゃんが しゃべる あいだ（テスト台では しゃべらない） */
export function onFloraVoice(_cb: (speaking: boolean) => void) { return () => {} }
