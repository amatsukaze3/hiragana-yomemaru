// 母音・ん の カードを こえの とうろく（周波数解析）で 判定した ときの せいど（会話の 中の 調査用）
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { judgeOnce, capture } from './harness'
const SKIPV = (process.env.SKIPV ?? 'v10n,v10k,v11n').split(',')
const DIR = process.env.AUD ?? '/home/claude/jt/f32'
const load = (f: string) => { const b = readFileSync(`${DIR}/${f}.f32`); return new Float32Array(b.buffer, b.byteOffset, b.length / 4) }
const files = readdirSync(DIR).filter((f) => f.endsWith('.f32')).map((f) => f.replace('.f32', ''))
const voices = [...new Set(files.map((f) => f.split('_')[0]))].sort()
const T: Record<string, string> = Object.fromEntries(Object.entries({ a: 'ア', i: 'イ', u: 'ウ', e: 'エ', o: 'オ', n: 'ン' }).filter(([k]) => !process.env.ONLY || process.env.ONLY.split(',').includes(k)))
const VOW = ['a', 'i', 'u', 'e', 'o']
const CONS: Record<string, string[]> = {
  a: ['ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa'], i: ['ki', 'shi', 'chi', 'ni', 'hi', 'mi', 'ri'], u: ['ku', 'su', 'tsu', 'nu', 'fu', 'mu', 'yu', 'ru'],
  e: ['ke', 'se', 'te', 'ne', 'he', 'me', 're'], o: ['ko', 'so', 'to', 'no', 'ho', 'mo', 'yo', 'ro'], n: ['mu', 'nu', 'u', 'na', 'ne', 'no', 'ni', 'ma', 'mo'],
}
let ok = 0, n = 0, wv = 0, wvn = 0, wc = 0, wcn = 0
const per: Record<string, number[]> = {}
for (const v of voices.filter((x) => !SKIPV.includes(x))) {
  const rows = ['a', 'i', 'u', 'e', 'o', 'n'].map((r) => existsSync(`${DIR}/${v}_${r}.f32`) ? capture(load(`${v}_${r}`), { noiseDb: -110 }, `${v}_${r}`) : null)
  if (!rows.slice(0, 5).every(Boolean)) { console.log('とうろく できず', v); continue }
  const vp = (rows[5] ? rows : rows.slice(0, 5)) as number[][]
  for (const r of Object.keys(T)) {
    const p = (per[r] ??= [0, 0, 0, 0, 0, 0])
    const o = { voiceprint: vp, noiseDb: -110, acoustic: !process.env.PC }
    if (existsSync(`${DIR}/${v}_${r}.f32`)) { n++; p[1]++; if (judgeOnce(load(`${v}_${r}`), T[r], o, `${v}_${r}vp`)) { ok++; p[0]++ } else if (process.env.MISS) console.log('おちた', v, r) }
    for (const x of (r === 'n' ? ['a', 'i', 'e', 'o'] : VOW.filter((y) => y !== r))) {
      if (!existsSync(`${DIR}/${v}_${x}.f32`)) continue
      wvn++; p[3]++; if (!judgeOnce(load(`${v}_${x}`), T[r], o, `${v}_${x}vp`)) { wv++; p[2]++ }
    }
    for (const x of CONS[r]) {
      if (!existsSync(`${DIR}/${v}_${x}.f32`)) continue
      wcn++; p[5]++; if (!judgeOnce(load(`${v}_${x}`), T[r], o, `${v}_${x}vp`)) { wc++; p[4]++ } else if (process.env.MISS) console.log('とおった', v, r, '<-', x)
    }
  }
}
const pc = (a: number, b: number) => `${a}/${b} (${((100 * a) / Math.max(1, b)).toFixed(0)}%)`
console.log(`ただしい よみ 合格 ${pc(ok, n)}  ちがう 母音を 不合格 ${pc(wv, wvn)}  子音つき（ka など）を 不合格 ${pc(wc, wcn)}`)
for (const [r, p] of Object.entries(per)) console.log(`  ${r}: 合格 ${pc(p[0], p[1])}  ちがう母音 不合格 ${pc(p[2], p[3])}  子音つき 不合格 ${pc(p[4], p[5])}`)
