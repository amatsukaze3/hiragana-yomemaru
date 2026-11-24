import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { judgeOnce, capture, type RunOpts } from './harness'
if (process.env.NOONSET) (globalThis as any).__noOnset = true

const DIR = process.env.AUD ?? './f32'
const KANA: Record<string, string> = {}
'ア:a イ:i ウ:u エ:e オ:o カ:ka キ:ki ク:ku ケ:ke コ:ko サ:sa シ:shi ス:su セ:se ソ:so タ:ta チ:chi ツ:tsu テ:te ト:to ナ:na ニ:ni ヌ:nu ネ:ne ノ:no ハ:ha ヒ:hi フ:fu ヘ:he ホ:ho マ:ma ミ:mi ム:mu メ:me モ:mo ヤ:ya ユ:yu ヨ:yo ラ:ra リ:ri ル:ru レ:re ロ:ro ワ:wa ン:n'
  .split(' ').forEach((p) => { const [k, r] = p.split(':'); KANA[r] = k })
const VOW = (r: string) => (r === 'n' ? 'n' : r.slice(-1))
const cacheL = new Map<string, Float32Array>()
const load = (f: string) => { let x = cacheL.get(f); if (!x) { const b = readFileSync(`${DIR}/${f}.f32`); x = new Float32Array(b.buffer, b.byteOffset, b.length / 4); cacheL.set(f, x) } return x }

const files = readdirSync(DIR).filter((f) => f.endsWith('.f32')).map((f) => f.replace('.f32', ''))
const voices = [...new Set(files.map((f) => f.split('_')[0]))].sort().filter((v) => !process.env.ONLYV || v.startsWith(process.env.ONLYV))
const modes: [string, (v: string) => RunOpts][] = []
const MODE = process.env.MODE ?? 'model,vp,noisy'
const vps: Record<string, number[][] | null> = {}
for (const v of voices) {
  const rows = ['a', 'i', 'u', 'e', 'o', 'n'].map((r) => capture(load(`${v}_${r}`), {}, `${v}_${r}`))
  vps[v] = rows.slice(0, 5).every(Boolean) ? ((rows[5] ? rows : rows.slice(0, 5)) as number[][]) : null
}
if (MODE.includes('model')) modes.push(['model', () => ({})])
if (MODE.includes('vp')) modes.push(['vp', (v) => ({ voiceprint: vps[v] })])
if (MODE.includes('noisy')) modes.push(['noisy', (v) => ({ voiceprint: vps[v], noiseDb: -42, seed: 7 })])
if (MODE.includes('asr')) modes.push(['asr', () => ({ asr: true })])

const rows = Object.keys(KANA)
const onlyT = process.env.T?.split(',')
for (const [mname, mo] of modes) {
  let ok = 0, okN = 0, bareFail = 0, bareN = 0, crossFail = 0, crossN = 0
  const missOk: string[] = [], passBare: string[] = []
  const perT: Record<string, { ok: number; n: number; bare: number; bn: number; cross: number; cn: number }> = {}
  for (const r of rows) {
    if (onlyT && !onlyT.includes(r)) continue
    const t = KANA[r]
    const st = (perT[r] = { ok: 0, n: 0, bare: 0, bn: 0, cross: 0, cn: 0 })
    for (const v of voices) {
      const o = mo(v)
      if (!existsSync(`${DIR}/${v}_${r}.f32`)) continue
      const p = judgeOnce(load(`${v}_${r}`), t, o, `${v}_${r}`)
      st.n++; okN++
      if (p) { st.ok++; ok++ } else missOk.push(`${v}:${r}`)
      // 母音だけ（あ行の 目標は ほかの 子音で）
      const others = rows.filter((x) => x !== r && VOW(x) === VOW(r) && x !== 'n')
      for (const x of others) {
        const isBare = x.length === 1
        const q = judgeOnce(load(`${v}_${x}`), t, o, `${v}_${x}`)
        if (isBare) { st.bn++; bareN++; if (!q) { st.bare++; bareFail++ } else passBare.push(`${v}:${r}<-${x}`) }
        else { st.cn++; crossN++; if (!q) { st.cross++; crossFail++ } }
      }
    }
  }
  console.log(`== ${mname}: 正しい読みで合格 ${ok}/${okN} (${((100 * ok) / okN).toFixed(1)}%)  母音だけを不合格 ${bareFail}/${bareN} (${((100 * bareFail) / Math.max(1, bareN)).toFixed(1)}%)  ちがう子音を不合格 ${crossFail}/${crossN} (${((100 * crossFail) / Math.max(1, crossN)).toFixed(1)}%)`)
  if (process.env.DETAIL)
    for (const [r, s] of Object.entries(perT)) console.log(`  ${r.padEnd(4)} 合格 ${s.ok}/${s.n}  母音だけ不合格 ${s.bare}/${s.bn}  ほかの子音不合格 ${s.cross}/${s.cn}`)
  if (process.env.MISS) console.log('  落ちた正解:', missOk.slice(0, 60).join(' '))
}
