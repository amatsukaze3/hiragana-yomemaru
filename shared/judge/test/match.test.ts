// node shared/judge/test/match.test.ts で うごかす（match.ts の 表と きまりの テスト）
import { classify, matchTargets, type Script } from '../match.ts'

let fail = 0
let n = 0
function expectKind(script: Script, target: string, heard: string, want: string | string[]) {
  n++
  const got = classify(target, heard, script).kind
  const ok = Array.isArray(want) ? want.includes(got) : got === want
  if (!ok) {
    fail++
    console.log(`NG [${script}] ${target} ← "${heard}" : ${got}（のぞみ ${want}）`)
  }
}
const PASS = ['match', 'variant']
const ALL: Script[] = ['hira', 'kata', 'roma', 'ROMA']

// ら行：とおる もの
const okRa: Record<string, string[]> = {
  ら: ['ら', 'ラ', '等', '羅', 'Ra', 'RA', 'La', 'la', 'らー', 'ラー', 'ららら', 'ら ら', 'ら、', 'あら', 'らあ', 'Rah', 'Lalala', 'だ', 'ダ', 'da', 'ラッ', 'ら。', 'ﾗ'],
  り: ['り', 'リ', '理', '利', 'Lee', 'li', 'Ri', 'りー', 'リー', 'りい', 'じ', 'ぢ', 'ディ', 'Dee', 'D', 'Lea'],
  る: ['る', 'ル', '流', '留', 'Lu', 'Lou', 'Roo', 'るー', 'ルー', 'ず', 'づ', 'ドゥ', 'zu', 'du', 'るう'],
  れ: ['れ', 'レ', '例', '礼', '0', 'Ray', 'Re', 'レイ', 'れい', 'れー', 'で', 'デ', 'de', 'Lay'],
  ろ: ['ろ', 'ロ', '路', '炉', 'Low', 'Row', 'Ro', 'ロー', 'ろう', 'ど', 'ド', 'do', 'Lo'],
}
for (const s of ALL) for (const [t, list] of Object.entries(okRa)) for (const h of list) {
  expectKind(s, t, h, PASS)
  expectKind(s, t.replace(/./, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60)), h, PASS) // カタカナの キー
}
// ら行：母音だけ（合格に しない）
for (const s of ALL) {
  for (const h of ['あ', 'ア', 'ああ', 'あー', '亜', 'ah']) expectKind(s, 'ら', h, 'vowel')
  for (const h of ['い', 'イ', 'いー']) expectKind(s, 'り', h, 'vowel')
  for (const h of ['う', 'ウ', 'うー']) expectKind(s, 'る', h, 'vowel')
  for (const h of ['え', 'エ', 'ええ']) expectKind(s, 'れ', h, 'vowel')
  for (const h of ['お', 'オ', 'おー']) expectKind(s, 'ろ', h, 'vowel')
}
// ちがう 文字（合格に しない）
for (const s of ALL) {
  for (const h of ['な', 'か', 'さ', 'ち', 'う', 'わ', 'や']) expectKind(s, 'ら', h, ['other', 'confusable'])
  for (const h of ['に', 'こ', 'き', 'ち']) expectKind(s, 'り', h, ['other', 'confusable'])
  for (const h of ['ろ', 'ぬ', 'ど', 'く', 'む']) expectKind(s, 'る', h, ['other', 'confusable'])
  for (const h of ['ね', 'わ', 'け', 'へ']) expectKind(s, 'れ', h, ['other', 'confusable'])
  for (const h of ['る', 'の', 'こ', 'ぼ', 'ほ']) expectKind(s, 'ろ', h, ['other', 'confusable'])
}
// 形の にた 文字
expectKind('hira', 'ら', 'う', 'confusable')
expectKind('hira', 'り', 'こ', 'confusable')
expectKind('hira', 'る', 'ろ', 'confusable')
expectKind('hira', 'れ', 'ね', 'confusable')
expectKind('hira', 'ろ', 'る', 'confusable')
expectKind('kata', 'ラ', 'フ', 'confusable')
expectKind('kata', 'ロ', 'コ', 'confusable')
expectKind('kata', 'リ', 'ソ', 'confusable')
expectKind('roma', 'ラ', 'な', 'confusable')
expectKind('roma', 'ロ', 'の', 'confusable')

// ほかの 行（これまでと おなじ）
expectKind('hira', 'か', 'か', 'match')
expectKind('hira', 'か', 'かあ', 'match')
expectKind('hira', 'か', '蚊', 'match')
expectKind('hira', 'か', 'あ', 'vowel')
expectKind('hira', 'か', 'さ か', 'match')
expectKind('hira', 'く', 'かきく', 'match')
expectKind('hira', 'あ', 'あ', 'match')
expectKind('hira', 'あ', 'ああ', 'match')
expectKind('hira', 'あ', 'かあ', ['other', 'long'])
expectKind('hira', 'い', 'かい', 'match')
expectKind('hira', 'ん', 'ん', 'match')
expectKind('hira', 'ん', 'うん', 'match')
expectKind('hira', 'ん', 'n', 'match')
expectKind('kata', 'ン', 'ン', 'match')
expectKind('hira', 'む', 'う', 'vowel')
expectKind('hira', 'し', 'C', 'match')
expectKind('hira', 'を', 'お', 'match')
expectKind('hira', 'お', 'を', 'match')
expectKind('hira', 'は', 'わ', 'match')
expectKind('hira', 'か', 'だ', ['other', 'confusable'])
expectKind('hira', 'た', 'だ', ['other', 'confusable'])

// いくつかの 目標・こうほ
function expectHit(targets: string[], alts: string[], want: string | null, script: Script = 'hira') {
  n++
  const got = matchTargets(targets, alts, script)?.kana ?? null
  if (got !== want) {
    fail++
    console.log(`NG hit [${targets}] ← [${alts}] : ${got}（のぞみ ${want}）`)
  }
}
expectHit(['ら', 'か'], ['から'], 'ら')
expectHit(['ら', 'か'], ['か'], 'か')
expectHit(['か', 'ら'], ['ら'], 'ら')
expectHit(['ら'], ['あ', 'ら'], 'ら')
expectHit(['ら'], ['う', 'ら'], null)
expectHit(['ラ'], ['フ', 'ラ'], null, 'kata')
expectHit(['ラ'], ['な', 'ら'], null, 'roma')
expectHit(['ラ'], ['な', 'ら'], null, 'kata') // いちばんが ちがう 文字（な）
expectHit(['ら'], ['ラ', 'あ'], 'ら')
expectHit(['ら'], ['らーめん', 'ら'], null)
expectHit(['ら'], ['Hello', 'ら'], 'ら') // いちばんが よめない ことば
expectHit(['ら'], ['あー', 'だ'], 'ら') // 母音だけ → 2ばんめの こどもの はつおん
expectHit(['ら'], ['あ'], null)
expectHit(['あ', 'ら'], ['あ'], 'あ')
expectHit(['ろ'], ['ドー'], 'ろ')
expectHit(['る'], ['ドー'], null)

console.log(fail ? `${fail}/${n} NG` : `ぜんぶ OK（${n}）`)
process.exit(fail ? 1 : 0)
