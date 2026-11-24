# マルチ合格エンジン（`shared/judge/`）

ひらがなよめ丸（`source/`）・カタカナはなちゃん（`katakana/`）・ひらがなデイジーちゃん（`daisy/`）・
ローマ字フローラちゃん（`romaji/`）・フローラちゃん おおもじ（`romaji-oomoji/`）の 5つの アプリで つかう 音声判定です（2026-11-25〜）。
これまでは アプリごとに おなじ `voice.ts` を コピーして いましたが、ここ 1か所に まとめました。
なおしたら 5つの アプリを build する だけで うつります（スペシャルモーラ `mora/` は べつの 判定の まま）。

## 合格の みち

| みち | どこで | なにを みるか |
|---|---|---|
| ① 音声認識 | すべて | こうほ（さいだい 10）を ぜんぶ ひらがなの よみに なおし（`match.ts`）、目標の 文字なら 合格。ラ・等・Ra・La・らー・ららら・あら なども |
| ② こどもの はつおん | すべて | ら行の はじきが だ行に なった 音：ら→だ、り→ぢ・じ・でぃ、る→づ・ず・どぅ、れ→で、ろ→ど（母音が おなじ ものだけ） |
| ③ 周波数解析 | パソコン・Android | 母音が あい、出だしの 学習モデルが 子音を はっきり きいた（これまでどおり） |
| ④ くみあわせ | パソコン・Android | ら行（り いがい）・な行・ま行：音声認識が 母音だけ（ら→あ）を きき、出だしの モデルが その 子音を きいた（どちらが さきでも よい） |
| ⑤ あ行・を・ん | すべて | これまでどおり（iPad は こえの とうろく が あれば 周波数解析） |

**合格に しない もの**：母音だけの よみ（か に あ）、ちがう 文字、形の にた 文字（ら↔う・ち、り↔い、る↔ろ、れ↔ね・わ、ラ↔フ・ヲ、ロ↔コ、ra↔na など。`match.ts` の CONFUSABLE）。
音声認識の いちばんめの こたえが 形の にた 文字なら、2ばんめ いこうに 目標が あっても 合格に しません。

### ぼおん ごうかく（2026-11-25〜。先生が きりかえる）
構音が 育ちとちゅうの 子むけ。せんせいメニュー（右上の「せんせい」→ 暗証番号）の「ごうかくの きじゅん」で
**しおん ごうかく**（ふだん。上の きまり）と **ぼおん ごうかく** を きりかえる。先生が もどすまで そのまま（`passMode.ts`。アプリごとに この 端末に おぼえる：`yomemaru:passMode`・`hanachan:passMode`・`daisy:passMode`・`flora:passMode`・`flora2:passMode`）。

ぼおん ごうかく の ときは、子音の ある 文字（か行〜わ）は **母音が あえば 合格**（子音は みない）：
- 音声認識：おなじ 母音の みじかい よみ（「か」に「あ」「た」「かー」「田」「ta」）で 合格（`match.ts` の `vowelFits`・`matchVowelTargets`。いちばんの こうほが ちがう 文字なら 2ばんめ いこうは みない）
- 周波数解析（パソコン・Android）：母音が あえば 合格（出だしの 子音は みない。音声認識が ちがう 母音を きいて いたら 合格しない）
- iPad：こえの とうろく が あれば どの カードも 周波数解析で きく（Apple の 音声認識は 母音だけの 声を ききとりにくい）。とうろく が なければ 音声認識（上の きまり）
- あ行・を・ん は かわらない。シューティングは ぴったりの 文字が さき、つぎに いちばんめの カード、ほかの カード の じゅん
- マイクの ところに「ぼおん ごうかく」の しるし。アセスメントの きろくには「ぼおん」の しるし

### ねらう 文字が いくつでも よい（シューティング）
`setTargets(いちばん, ほか)`・`setExtras(ほか)`。音声認識の みち（①②）は どの 目標でも、周波数解析の みち（③④⑤）は いちばんめだけ。
ほかの 文字で 合格したときは、いちばんめの 目標は そのまま きき つづけます。

## ファイル

- `kana46.ts` … 46もじの よみ・母音・子音の なかま
- `match.ts` … 音声認識の 文字を よみに なおして くらべる（漢字・英字・数字・こどもの はつおん・形の にた 文字）
- `engine.ts` … 判定エンジン本体（`JudgeEngine`）。iPad の 音声認識の とめかた・ききとり窓・マイクの きりかえ も ここ
- `onset.ts`・`onsetModel.json` … 出だしの 学習モデル（子音の なかま）
- `vowelClassifier.ts`・`vowelModel.json` … 母音の 学習モデル・こえの とうろく
- `log.ts` … 判定の きろく（せんせい用。せってい の「判定の きろく」→「コピー」）
- `passMode.ts` … 合格の きじゅん（しおん ごうかく／ぼおん ごうかく）の 保存

アプリの がわは `src/lib/voice.ts`（音まわり・文字の しゅるい・きろくの キーを わたす だけ）と `src/lib/useVoiceJudge.ts`（React の フック）。

## テスト（`test/`）

```
cd romaji/source && npm install            # esbuild を つかう
node shared/judge/test/match.test.ts       # 文字あわせ（1059 こ。ぼおん ごうかく も）
cd shared/judge/test
node build.mjs engine_routes && node /tmp/judge_engine_routes.mjs   # iPad の まねで みち①②・形の にた 文字・ほかの カード・ぼおん ごうかく
node build.mjs ios_vowelmode && node /tmp/judge_ios_vowelmode.mjs   # iPad の ぼおん ごうかく：とうろく が あれば 子音の カードも 周波数解析
node build.mjs ios_mock && EVENTS=0 node /tmp/judge_ios_mock.mjs     # iPad：1かいめで 合格する わりあい
node build.mjs ios_switch && node /tmp/judge_ios_switch.mjs         # iPad：音声認識 ⇄ こえの とうろく の きりかえ
node build.mjs pc_fuse && AUD=f32の場所 node /tmp/judge_pc_fuse.mjs   # パソコン：みち④（VOICEVOX の 声）
node build.mjs run && AUD=f32の場所 MODE=asr,vp node /tmp/judge_run.mjs  # 周波数解析（VOICEVOX 14声）
node build.mjs pc_vowelmode && AUD=f32の場所 node /tmp/judge_pc_vowelmode.mjs  # ぼおん ごうかく の 周波数解析（音声認識の けっかが こない とき）
cd shoot_ios && python3 run.py 400         # シューティング（本物の Chrome で iPad の まね。old.html・new.html を おく）
```

VOICEVOX の テスト音声は `judge-test-audio` ブランチ（`romaji/tools/judge_test/make_test_audio.py`・`conv.py`）。

### 2026-11-25 の けっか
- 文字あわせ 863 こ・みち 74 こ ぜんぶ OK
- みち④（パソコン、音声認識が ら行を 母音だけ と きいた とき）：ら行の 声の 49% が 合格、母音だけの 声は 0%（VOICEVOX）
- iPad の まね（1かいめ 合格）・周波数解析（VOICEVOX）・こえの とうろく：まえと おなじ
- シューティング（iPad の まね）：わくに かまわず よむ子 1かいめ 85% → 100%（声の 知らせ あり）

### 2026-11-25 ぼおん ごうかく の けっか
- 文字あわせ 1059 こ・みち 140 こ・iPad の きりかえ 11 こ ぜんぶ OK。しおん ごうかく は かわらない（母音だけの 声で 合格 0%）
- 周波数解析だけ（音声認識が なにも かえさない とき、VOICEVOX 14声）：とうろく あり（パソコン・iPad）で ただしい 声 78%・母音だけの 声 84% が 1かいめで 合格、
  ちがう 母音の 声で 合格（まちがい）2〜3%。とうろく なし は 39%／37%（まちがい 6〜7%）で、パソコンは 音声認識の みちが おもに なる
- 5つの アプリの シューティング（本物の Chrome、iPad の まね・パソコンの まね）：せんせいメニューで きりかえ → おなじ 母音の ちがう 文字で GET、しおん では GET しない

## 直して 公開する
1. ここを なおす（`node shared/judge/test/match.test.ts` などで たしかめる）
2. 5つの アプリで `npm run build:single`・`npm run build:single:shoot` → それぞれの `index.html`・`shooting/index.html` に コピー
   （よめ丸の シューティング単体は amatsukaze3/yomemaru-shooting リポジトリの `index.html`）
