import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { judgeOnce } from './harness'
const DIR = './f32'
const files = readdirSync(DIR).filter((f) => f.endsWith('.f32')).map((f) => f.replace('.f32', ''))
const load = (f: string) => { const b = readFileSync(`${DIR}/${f}.f32`); return new Float32Array(b.buffer, b.byteOffset, b.length / 4) }
const conds = [
  { noiseDb: -62, gain: 1, seed: 1 },
  { noiseDb: -45, gain: 1, seed: 2 },
  { noiseDb: -40, gain: 0.5, seed: 3 },
  { noiseDb: -50, gain: 0.25, seed: 4 },
]
const out: { f: string; c: number; feat: number[] }[] = []
for (const f of files) {
  if (f.endsWith('_n')) continue
  const x = load(f)
  conds.forEach((c, ci) => {
    // ずらし：ブロックの くぎりが かわるよう、まえに 0〜22ms の むおん
    const sh = Math.floor((ci * 337) % 1104)
    const y = new Float32Array(x.length + sh); y.set(x, sh)
    const d: number[][] = []
    ;(globalThis as any).__onsetDump = d
    judgeOnce(y, 'ア', c, `${f}#${ci}`)
    if (d.length) { const best = d.reduce((a, b) => (b[0] > a[0] ? b : a)); out.push({ f, c: ci, feat: best.slice(1) }) }
  })
}
writeFileSync('./onset_feats.json', JSON.stringify(out))
console.log('dumped', out.length, 'of', files.length * conds.length)
