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

アプリの がわは `src/lib/voice.ts`（音まわり・文字の しゅるい・きろくの キーを わたす だけ）と `src/lib/useVoiceJudge.ts`（React の フック）。

## テスト（`test/`）

```
cd romaji/source && npm install            # esbuild を つかう
node shared/judge/test/match.test.ts       # 文字あわせ（863 こ）
cd shared/judge/test
node build.mjs engine_routes && node /tmp/judge_engine_routes.mjs   # iPad の まねで みち①②・形の にた 文字・ほかの カード
node build.mjs ios_mock && EVENTS=0 node /tmp/judge_ios_mock.mjs     # iPad：1かいめで 合格する わりあい
node build.mjs ios_switch && node /tmp/judge_ios_switch.mjs         # iPad：音声認識 ⇄ こえの とうろく の きりかえ
node build.mjs pc_fuse && AUD=f32の場所 node /tmp/judge_pc_fuse.mjs   # パソコン：みち④（VOICEVOX の 声）
node build.mjs run && AUD=f32の場所 MODE=asr,vp node /tmp/judge_run.mjs  # 周波数解析（VOICEVOX 14声）
cd shoot_ios && python3 run.py 400         # シューティング（本物の Chrome で iPad の まね。old.html・new.html を おく）
```

VOICEVOX の テスト音声は `judge-test-audio` ブランチ（`romaji/tools/judge_test/make_test_audio.py`・`conv.py`）。

### 2026-11-25 の けっか
- 文字あわせ 863 こ・みち 74 こ ぜんぶ OK
- みち④（パソコン、音声認識が ら行を 母音だけ と きいた とき）：ら行の 声の 49% が 合格、母音だけの 声は 0%（VOICEVOX）
- iPad の まね（1かいめ 合格）・周波数解析（VOICEVOX）・こえの とうろく：まえと おなじ
- シューティング（iPad の まね）：わくに かまわず よむ子 1かいめ 85% → 100%（声の 知らせ あり）

## 直して 公開する
1. ここを なおす（`node shared/judge/test/match.test.ts` などで たしかめる）
2. 5つの アプリで `npm run build:single`・`npm run build:single:shoot` → それぞれの `index.html`・`shooting/index.html` に コピー
   （よめ丸の シューティング単体は amatsukaze3/yomemaru-shooting リポジトリの `index.html`）
