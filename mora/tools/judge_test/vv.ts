import { readFileSync, existsSync } from 'node:fs'
import { capture, judgeOnce } from './harness'
const ld = (n: string) => { const b = readFileSync(`./f32/${n}.f32`); return new Float32Array(b.buffer, b.byteOffset, b.length / 4) }
const voices: string[] = []
for (let i = 0; i < 14; i++) for (const v of ['n', 'k']) voices.push(`v${String(i).padStart(2, '0')}${v}`)
const H: Record<string, string> = { ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご', za: 'ざ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ', da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど', ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ', pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ', gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ', sha: 'しゃ', shu: 'しゅ', sho: 'しょ', ja: 'じゃ', ju: 'じゅ', jo: 'じょ', cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ', hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ', bya: 'びゃ', byu: 'びゅ', byo: 'びょ', pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ', mya: 'みゃ', myu: 'みゅ', myo: 'みょ', rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ' }
const tests: [string, string, string][] = [] // [group, token, target]
const pair = (g: string, toks: string, tgts: string) => toks.split(' ').forEach((t, i) => tests.push([g, t, H[tgts.split(' ')[i]]]))
// 正しい よみ
pair('正 が行', 'ga gi gu ge go', 'ga gi gu ge go'); pair('正 ざ行', 'za ji zu ze zo', 'za ji zu ze zo'); pair('正 だ行', 'da di du de do', 'da di du de do'); pair('正 ば行', 'ba bi bu be bo', 'ba bi bu be bo'); pair('正 ぱ行', 'pa pi pu pe po', 'pa pi pu pe po')
pair('正 拗音', 'kya kyu kyo sha shu sho cha chu cho nya nyu nyo hya hyu hyo mya myu myo rya ryu ryo pya pyu pyo', 'kya kyu kyo sha shu sho cha chu cho nya nyu nyo hya hyu hyo mya myu myo rya ryu ryo pya pyu pyo')
pair('正 拗音(濁)', 'gya gyu gyo ja ju jo bya byu byo', 'gya gyu gyo ja ju jo bya byu byo')
// にごりを わすれた よみ
pair('誤 か→が', 'ka ki ku ke ko', 'ga gi gu ge go'); pair('誤 さ→ざ', 'sa shi su se so', 'za ji zu ze zo'); pair('誤 た→だ', 'ta te to', 'da de do'); pair('誤 ち/つ→ぢ/づ', 'chi tsu', 'di du')
pair('誤 は→ば', 'ha hi fu he ho', 'ba bi bu be bo'); pair('誤 ぱ→ば', 'pa pi pu pe po', 'ba bi bu be bo'); pair('誤 きゃ→ぎゃ', 'kya kyu kyo', 'gya gyu gyo'); pair('誤 しゃ→じゃ', 'sha shu sho', 'ja ju jo'); pair('誤 ぴゃ→びゃ', 'pya pyu pyo', 'bya byu byo')
// 母音だけ・ちがう 母音
pair('誤 母音だけ→が行', 'a i u e o', 'ga gi gu ge go'); pair('誤 ちがう母音 が行', 'gi gu ge go ga', 'ga gi gu ge go'); pair('誤 ちがう母音 きゃ行', 'kyu kyo kya', 'kya kyu kyo')
const res: Record<string, [number, number]> = {}
for (const v of voices) {
  const vp = ['a', 'i', 'u', 'e', 'o'].map((x) => capture(ld(`${v}_${x}`), {}, `${v}c${x}`))
  if (vp.some((x) => !x)) { console.log('とうろく できず', v); continue }
  for (const [g, tok, t] of tests) {
    if (!existsSync(`./f32/${v}_${tok}.f32`)) continue
    const p = judgeOnce(ld(`${v}_${tok}`), t, { voiceprint: vp as number[][], noiseDb: -50, seed: 3 }, `${v}_${tok}`)
    const r = (res[g] ??= [0, 0]); r[0] += p ? 1 : 0; r[1]++
  }
}
for (const [g, [a, n]] of Object.entries(res)) console.log(`${g.padEnd(16)} 合格 ${((a / n) * 100).toFixed(0).padStart(3)}%  (${a}/${n})`)
