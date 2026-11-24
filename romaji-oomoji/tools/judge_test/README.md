# 判定エンジンの テスト台（ローマ字フローラちゃん）

「か」に「あ」と よんでも 合格してしまう 問題（母音しか みていなかった）を なおすときに つくった しくみ。

1. テスト音声：`judge-test-audio` ブランチに push すると Actions（`.github/workflows/judge-test-audio.yml`）が VOICEVOX の 14の声 × 45もじ × 2（ふつう・こどもに ちかづけた 声）を `audio/*.flac` に つくる（音声は その ブランチに だけ ある）
2. `python3 conv.py audio f32` … 48kHz の float32 に する
3. `node build.mjs run && node /tmp/judge_run.mjs` … voice.ts を そのまま うごかし（AnalyserNode を まねる）、
   正しい よみの 合格率・母音だけの 不合格率・ちがう 子音の 不合格率 を だす（MODE=model,vp,noisy,asr ／ NOONSET=1 で 子音チェック なし）
4. 子音の 学習モデル：`node build.mjs dump && node /tmp/judge_dump.mjs`（出だしの 特徴を onset_feats.json に）→
   `python3 final.py 1.0 24 0.92 ../../source/src/lib/onsetModel.json`（声ごとに はずして ためした 数字を だしてから 保存）

2026-11-23 の 結果（のこりの 1つの 声で ためした 数字。正しい よみの 92% が とおる しきいち）：
母音だけの よみが とおってしまう 割合　か・た行 42%、さ行 5%、は行 36%、な・ま行 22%、や行 9%、わ 40%、ら行 58%（前は ほぼ 100%）

## iPhone・iPad（Apple の 音声認識だけ）の まね：`ios_mock.ts`
`node build.mjs ios_mock && node /tmp/judge_ios_mock.mjs` … Apple の 音声認識を まねた もの（つづけて よむと まえの 文字と つなげて ことばに かきかえる：か＋き →「柿」）で、
おぼえる ステップ5の ながれ（合格 → 0.7びょうで つぎの 文字）を うごかし、1かいめで 合格する わりあいを だす（START_MS：音声認識が きけるように なるまで、READ_AFTER：文字が でてから よむまで）。
2026-11-24：合格の たびに 音声認識を あたらしく する まえ 89% → あと 100%

## iPad の シューティングの まね：`shoot_ios/`
本物の Chrome（playwright）で シューティングの 単体ページ（`old.html`・`new.html` を この フォルダに おく）を iPad の ふりで うごかし、
Apple の 音声認識の まね（`mock.js`：start から START_MS で きけるように なる）と こども の まね（`child.js`）で、あてた すぐ あとの カードが 1かいめで 合格する わりあいを だす。
2026-11-24（START_MS=400、はやい モード）：まえ 0〜12%（あてた あと 約1.3びょう マイクが とまって いて、その あいだに よむと きこえない）→ あと 82〜100%（マイクが もどるまで カードを とめ、もどったら わくを ひからせる）
