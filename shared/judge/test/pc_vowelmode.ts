// パソコン・Android（周波数解析）の ぼおん ごうかく：子音の ある 文字は 母音が あえば 合格（子音は みない）。
// 音声認識の けっかは こない（こどもの 声を 音声認識が ききとれなかった）ときの 周波数解析だけの みちを みる。
// AUD=f32の フォルダ node build.mjs pc_vowelmode && node /tmp/judge_pc_vowelmode.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { judgeOnce, capture, type RunOpts } from './harness'
const DIR = process.env.AUD ?? './f32'
const load = (f: string) => { const b = readFileSync(`${DIR}/${f}.f32`); return new Float32Array(b.buffer, b.byteOffset, b.length / 4) }
const files = readdirSync(DIR).filter((f) => f.endsWith('.f32')).map((f) => f.replace('.f32', ''))
const voices = [...new Set(files.map((f) => f.split('_')[0]))].sort()
const ROMA: Record<string, string> = {
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko', さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho', ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo', ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa',
}
const VOWEL_OF = (r: string) => r[r.length - 1]
const BARE: Record<string, string> = { a: 'a', i: 'i', u: 'u', e: 'e', o: 'o' }
const pc = (a: number, b: number) => `${a}/${b} (${((100 * a) / Math.max(1, b)).toFixed(0)}%)`
// こえの とうろく（その 声の あいうえお・ん）
const vps = new Map<string, number[][] | null>()
for (const v of voices) {
  const rows = ['a', 'i', 'u', 'e', 'o', 'n'].map((s) => (existsSync(`${DIR}/${v}_${s}.f32`) ? capture(load(`${v}_${s}`), {}, `${v}_${s}`) : null))
  vps.set(v, rows.slice(0, 5).every(Boolean) ? (rows.filter(Boolean) as number[][]) : null)
}
const confs: [string, (v: string) => RunOpts][] = [
  ['パソコン（音声認識 うごく・とうろく なし）', () => ({ asr: true })],
  ['パソコン（音声認識 うごく・とうろく あり）', (v) => ({ asr: true, voiceprint: vps.get(v) })],
  ['音声認識 なし・とうろく なし', () => ({ asr: false })],
  ['iPad（こえの とうろく で きく）', (v) => ({ asr: false, acoustic: true, voiceprint: vps.get(v) })],
]
for (const [name, mk] of confs) {
  let same = 0, sameN = 0, bare = 0, bareN = 0, other = 0, otherN = 0, otherBare = 0, otherBareN = 0, strictBare = 0, strictBareN = 0
  for (const v of voices) {
    const base = mk(v)
    if ((base.voiceprint === null || base.voiceprint === undefined) && (name.includes('とうろく あり') || name.includes('iPad'))) continue
    for (const [k, r] of Object.entries(ROMA)) {
      const vw = VOWEL_OF(r)
      // 1. ただしく よんだ 声（か ← ka）
      if (existsSync(`${DIR}/${v}_${r}.f32`)) { sameN++; if (judgeOnce(load(`${v}_${r}`), k, { ...base, vowelMode: true }, `${v}_${r}`)) same++ }
      // 2. 母音だけ（か ← a）：ぼおん ごうかく では 合格／しおん では 合格しない
      if (existsSync(`${DIR}/${v}_${vw}.f32`)) {
        bareN++; if (judgeOnce(load(`${v}_${vw}`), k, { ...base, vowelMode: true }, `${v}_${vw}`)) bare++
        strictBareN++; if (judgeOnce(load(`${v}_${vw}`), k, { ...base }, `${v}_${vw}`)) strictBare++
      }
      // 3. ちがう 母音の 声（か ← ki・ku・ke・ko と い・う・え・お）：合格しない
      for (const r2 of Object.values(ROMA)) {
        if (VOWEL_OF(r2) === vw || r2[0] !== r[0]) continue
        if (existsSync(`${DIR}/${v}_${r2}.f32`)) { otherN++; if (judgeOnce(load(`${v}_${r2}`), k, { ...base, vowelMode: true }, `${v}_${r2}`)) other++ }
      }
      for (const b of Object.keys(BARE)) {
        if (b === vw || !existsSync(`${DIR}/${v}_${b}.f32`)) continue
        otherBareN++; if (judgeOnce(load(`${v}_${b}`), k, { ...base, vowelMode: true }, `${v}_${b}`)) otherBare++
      }
    }
  }
  console.log(`${name}\n  ぼおん：ただしい 声 ${pc(same, sameN)}・母音だけ ${pc(bare, bareN)}｜まちがい（ちがう 母音）子音つき ${pc(other, otherN)}・母音だけ ${pc(otherBare, otherBareN)}｜しおん：母音だけで 合格（まちがい）${pc(strictBare, strictBareN)}`)
}
