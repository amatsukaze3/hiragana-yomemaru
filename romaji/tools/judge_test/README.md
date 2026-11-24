# 判定エンジンの テスト台（ローマ字フローラちゃん → 5つの アプリ 共通に）

2026-11-25 から 判定エンジンは `shared/judge/` に まとめ、テスト台も `shared/judge/test/` に うつしました（くわしくは `shared/judge/README.md`）。

ここに のこって いる もの：
- `make_test_audio.py` … VOICEVOX で テスト音声を つくる（`judge-test-audio` ブランチに push すると Actions で うごく）
- `conv.py` … `python3 conv.py audio f32` で 48kHz の float32 に する
- `final.py` … 出だしの 学習モデル（`shared/judge/onsetModel.json`）を つくる：
  `node shared/judge/test/build.mjs dump && node /tmp/judge_dump.mjs`（出だしの 特徴を onset_feats.json に）→
  `python3 final.py 1.0 24 0.92 ../../../shared/judge/onsetModel.json`

2026-11-23 の 結果（のこりの 1つの 声で ためした 数字。正しい よみの 92% が とおる しきいち）：
母音だけの よみが とおってしまう 割合　か・た行 42%、さ行 5%、は行 36%、な・ま行 22%、や行 9%、わ 40%、ら行 58%（前は ほぼ 100%）
