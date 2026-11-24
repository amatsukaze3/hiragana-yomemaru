// パソコン（Google の 音声認識＋周波数解析）：ら行で 音声認識が 母音だけ（ら→あ）を きいた ときの みち④ の テスト
// AUD=f32の フォルダ node build.mjs pc_fuse && node /tmp/judge_pc_fuse.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { judgeOnce } from './harness'
const DIR = process.env.AUD ?? './f32'
const load = (f: string) => { const b = readFileSync(`${DIR}/${f}.f32`); return new Float32Array(b.buffer, b.byteOffset, b.length / 4) }
const files = readdirSync(DIR).filter((f) => f.endsWith('.f32')).map((f) => f.replace('.f32', ''))
const voices = [...new Set(files.map((f) => f.split('_')[0]))].sort()
const T: Record<string, [string, string]> = { ra: ['ラ', 'あ'], ri: ['リ', 'い'], ru: ['ル', 'う'], re: ['レ', 'え'], ro: ['ロ', 'お'] }
// 音声認識の けっかが とどく 時刻（目標を きめて から。音声は 1.6びょう めから はじまり 約0.3びょう）
for (const asrAt of (process.env.AT ?? "700,1200,1800,2400").split(",").map(Number)) {
  let rOk = 0, rN = 0, vOk = 0, vN = 0, nOk = 0, nN = 0
  for (const v of voices) for (const [r, [k, vowel]] of Object.entries(T)) {
    if (existsSync(`${DIR}/${v}_${r}.f32`)) { rN++; if (judgeOnce(load(`${v}_${r}`), k, { asr: true, asrAt, asrAlts: [vowel] }, `${v}_${r}`)) rOk++ }
    const bare = r.slice(1)
    if (existsSync(`${DIR}/${v}_${bare}.f32`)) { vN++; if (judgeOnce(load(`${v}_${bare}`), k, { asr: true, asrAt, asrAlts: [vowel] }, `${v}_${bare}`)) vOk++ }
    const nas = 'n' + bare
    if (existsSync(`${DIR}/${v}_${nas}.f32`)) { nN++; if (judgeOnce(load(`${v}_${nas}`), k, { asr: true, asrAt, asrAlts: [vowel] }, `${v}_${nas}`)) nOk++ }
  }
  const pc = (a: number, b: number) => `${a}/${b} (${((100 * a) / Math.max(1, b)).toFixed(0)}%)`
  console.log(`asr ${asrAt}ms（目標から）：ら行の 声で 合格 ${pc(rOk, rN)}  母音だけの 声で 合格（まちがい）${pc(vOk, vN)}  な行の 声で 合格（まちがい）${pc(nOk, nN)}`)
}
