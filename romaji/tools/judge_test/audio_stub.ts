export const getAudioContext = () => ({ sampleRate: 48000 })
export const setMicActive = () => {}
/** フローラちゃんが しゃべる あいだ（テスト台では しゃべらない） */
export function onFloraVoice(_cb: (speaking: boolean) => void) { return () => {} }
